import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyPassword } from "@/lib/password";
import type {
  EmailPasswordAuthResult,
  EmailPasswordLoginUserRow,
  PasswordLoginLockoutConfig,
} from "@/types/email-password-login";

const DEFAULT_MAX_FAILURES_BEFORE_LOCK = 10;
const DEFAULT_LOCKOUT_MINUTES = 30;

/**
 * 非負整数をパースする。
 * @param raw 文字列。非数値ならフォールバック値を返す。
 * @param fallback フォールバック値
 * @returns 数値
 */
function parseNonNegativeInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

/**
 * 正の整数をパースする。
 * @param raw 文字列。非数値ならフォールバック値を返す。
 * @param fallback フォールバック値
 * @returns 数値
 */
function parsePositiveMinutes(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

let cachedLockoutConfig: PasswordLoginLockoutConfig | undefined;

/**
 * メール+パスワードのロックアウト設定（環境変数）。
 * - `LOGIN_MAX_FAILURES` … ロック前に許容する連続失敗回数（既定 10 → 11 回目でロック）
 * - `LOGIN_LOCKOUT_MINUTES` … ロック時間（分、既定 30）
 */
export function getPasswordLoginLockoutConfig(): PasswordLoginLockoutConfig {
  if (cachedLockoutConfig) return cachedLockoutConfig;

  const maxFailuresBeforeLock = parseNonNegativeInt(
    process.env.LOGIN_MAX_FAILURES,
    DEFAULT_MAX_FAILURES_BEFORE_LOCK,
  );
  const lockoutMinutes = parsePositiveMinutes(
    process.env.LOGIN_LOCKOUT_MINUTES,
    DEFAULT_LOCKOUT_MINUTES,
  );

  cachedLockoutConfig = {
    maxFailuresBeforeLock,
    failuresThatTriggerLock: maxFailuresBeforeLock + 1,
    lockoutMs: lockoutMinutes * 60 * 1000,
  };
  return cachedLockoutConfig;
}

/** ロック中・ロック直後に返すユーザー向けメッセージ */
export const PASSWORD_LOGIN_LOCKED_MESSAGE =
  "ログイン試行の失敗が続いたため、アカウントをロックしました。時間をおいて再度お試しください。";

function isCurrentlyLocked(lockedUntil: string | null | undefined): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > Date.now();
}

/**
 * メール＋パスワード認証（失敗回数・ロックアウト込み）。
 * verify-credentials と NextAuth Credentials の両方から利用する。
 */
export async function authenticateEmailPassword(
  supabase: SupabaseClient,
  email: string,
  password: string,
): Promise<EmailPasswordAuthResult> {
  const { data: user } = await supabase
    .from("users")
    .select(
      "id, email, name, password_hash, email_verified, deleted_at, password_failed_attempts, password_locked_until",
    )
    .eq("email", email)
    .single();

  const row = user as EmailPasswordLoginUserRow | null;

  /** ユーザーが存在しないか、パスワードハッシュがない場合 */
  if (!row || !row.password_hash) {
    return { ok: false, reason: "invalid" };
  }

  /** ユーザーが論理削除されている場合 */
  if (row.deleted_at) {
    return { ok: false, reason: "invalid" };
  }

  /** メールアドレスが未認証の場合 */
  if (row.email_verified === false) {
    return { ok: false, reason: "unverified" };
  }

  const nowIso = new Date().toISOString();

  /** パスワード認証ロック中の場合 */
  if (isCurrentlyLocked(row.password_locked_until)) {
    return { ok: false, reason: "locked" };
  }

  let prevFailed = row.password_failed_attempts ?? 0;

  /** パスワード認証ロック中の場合 */
  if (row.password_locked_until) {
    // 期限切れロックをクリア（still locked は上で弾いている）
    await supabase
      .from("users")
      .update({
        password_failed_attempts: 0,
        password_locked_until: null,
        updated_at: nowIso,
      })
      .eq("id", row.id);
    prevFailed = 0;
  }

  const valid = await verifyPassword(password, row.password_hash);

  /** パスワードが正しい場合 */
  if (valid) {
    await supabase
      .from("users")
      .update({
        password_failed_attempts: 0,
        password_locked_until: null,
        updated_at: nowIso,
      })
      .eq("id", row.id);

    return {
      ok: true,
      user: {
        id: row.id,
        email: row.email ?? email,
        name: row.name,
      },
    };
  }

  const next = prevFailed + 1;
  const { failuresThatTriggerLock, lockoutMs } = getPasswordLoginLockoutConfig();

  /** パスワード認証ロックに至る連続失敗回数の場合 */
  if (next >= failuresThatTriggerLock) {
    const lockedUntil = new Date(Date.now() + lockoutMs).toISOString();
    await supabase
      .from("users")
      .update({
        password_failed_attempts: 0,
        password_locked_until: lockedUntil,
        updated_at: nowIso,
      })
      .eq("id", row.id);
    return { ok: false, reason: "locked" };
  }

  await supabase
    .from("users")
    .update({
      password_failed_attempts: next,
      updated_at: nowIso,
    })
    .eq("id", row.id);

  return { ok: false, reason: "invalid" };
}
