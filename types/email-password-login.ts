/** メール+パスワードのロックアウト設定（環境変数から組み立てた値）。
 * @property maxFailuresBeforeLock この回数まではロックしない（次の失敗でロック）。
 * @property failuresThatTriggerLock ロックに至る連続失敗回数（= maxFailuresBeforeLock + 1）。
 * @property lockoutMs ロック時間（ミリ秒）。
 */
export interface PasswordLoginLockoutConfig {
  /** この回数まではロックしない（次の失敗でロック） */
  maxFailuresBeforeLock: number;
  /** ロックに至る連続失敗回数（= maxFailuresBeforeLock + 1） */
  failuresThatTriggerLock: number;
  /** ロック時間（ミリ秒） */
  lockoutMs: number;
};

/** メール+パスワード認証失敗理由。
 * @property Invalid パスワードが無効。
 * @property Unverified メールアドレスが未認証。
 * @property Locked パスワード認証ロック中。
 */
export interface EmailPasswordAuthFailureReason {
  Invalid: "invalid";
  Unverified: "unverified";
  Locked: "locked";
}

/** 認証成功時のユーザー情報。
 * @property id ユーザーID。
 * @property email メールアドレス。
 * @property name ユーザー名。
 */
export interface EmailPasswordAuthUser {
  id: string;
  email: string;
  name: string | null;
};

/**
 * メール+パスワード認証結果。
 * @property ok 認証成功かどうか。
 * @property user 認証成功時のユーザー情報。
 * @property reason 認証失敗時の理由。
 */
export interface EmailPasswordAuthResult {
  ok: boolean;
  user?: EmailPasswordAuthUser;
  reason?: string;
}

/** `users` 行（メール+パスワードログイン用 select）。
 * @property id ユーザーID。
 * @property email メールアドレス。
 * @property name ユーザー名。
 * @property password_hash パスワードハッシュ。
 * @property email_verified メールアドレスが認証されているかどうか。
 * @property deleted_at 論理削除日時。
 * @property password_failed_attempts パスワード認証失敗回数。
 * @property password_locked_until パスワード認証ロック解除日時。
 */
export interface EmailPasswordLoginUserRow {
  id: string;
  email: string | null;
  name: string | null;
  password_hash: string | null;
  email_verified: boolean | null;
  deleted_at?: string | null;
  password_failed_attempts: number | null;
  password_locked_until: string | null;
};
