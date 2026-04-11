import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

export const ADMIN_GATE_MAX_FAILURES = 10;
/** 上限到達後のロック時間（分） */
export const ADMIN_GATE_LOCKOUT_MINUTES = 30;

const TABLE = "admin_gate_attempts";

type MemEntry = { failCount: number; lockedUntilMs: number };

function memMap(): Map<string, MemEntry> {
  const g = globalThis as unknown as { __reflectAdminGateMem?: Map<string, MemEntry> };
  if (!g.__reflectAdminGateMem) {
    g.__reflectAdminGateMem = new Map();
  }
  return g.__reflectAdminGateMem;
}

function nowMs(): number {
  return Date.now();
}

export async function adminGateGetState(id: Promise<string> | string): Promise<{
  locked: boolean;
  failCount: number;
}> {
  const key = typeof id === "string" ? id : await id;
  if (isSupabaseAdminConfigured()) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data, error } = await supabase
        .from(TABLE)
        .select("fail_count, locked_until")
        .eq("id", key)
        .maybeSingle();

      if (error) {
        logger.warn("[admin-gate] Supabase 読み取り失敗、メモリにフォールバック", {
          message: error.message,
        });
        return memGetState(key);
      }
      if (!data) {
        return { locked: false, failCount: 0 };
      }
      const lockedUntil = data.locked_until
        ? new Date(data.locked_until as string).getTime()
        : 0;
      const locked = lockedUntil > nowMs();
      return {
        locked,
        failCount: typeof data.fail_count === "number" ? data.fail_count : 0,
      };
    } catch (e) {
      logger.errorException("[admin-gate] Supabase 例外、メモリにフォールバック", e);
      return memGetState(key);
    }
  }
  return memGetState(key);
}

function memGetState(key: string): { locked: boolean; failCount: number } {
  const m = memMap().get(key);
  if (!m) return { locked: false, failCount: 0 };
  const locked = m.lockedUntilMs > nowMs();
  return { locked, failCount: m.failCount };
}

/** Record a failed gate password; returns whether the client is now locked out. */
export async function adminGateRecordFailure(id: Promise<string> | string): Promise<{
  locked: boolean;
}> {
  const key = typeof id === "string" ? id : await id;
  const state = await adminGateGetState(key);
  if (state.locked) {
    return { locked: true };
  }
  const nextCount = state.failCount + 1;
  const locked = nextCount >= ADMIN_GATE_MAX_FAILURES;
  const lockedUntilIso = locked
    ? new Date(nowMs() + ADMIN_GATE_LOCKOUT_MINUTES * 60 * 1000).toISOString()
    : null;

  if (isSupabaseAdminConfigured()) {
    try {
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase.from(TABLE).upsert(
        {
          id: key,
          fail_count: locked ? 0 : nextCount,
          locked_until: locked ? lockedUntilIso : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      if (error) {
        logger.warn("[admin-gate] Supabase更新失敗、メモリにフォールバック", {
          message: error.message,
        });
        memRecordFailure(key, nextCount, locked);
        return { locked };
      }
      return { locked };
    } catch (e) {
      logger.errorException("[admin-gate] Supabase 例外、メモリにフォールバック", e);
      memRecordFailure(key, nextCount, locked);
      return { locked };
    }
  }

  memRecordFailure(key, nextCount, locked);
  return { locked };
}

function memRecordFailure(key: string, nextCount: number, locked: boolean): void {
  const m = memMap();
  if (locked) {
    m.set(key, {
      failCount: 0,
      lockedUntilMs: nowMs() + ADMIN_GATE_LOCKOUT_MINUTES * 60 * 1000,
    });
  } else {
    m.set(key, {
      failCount: nextCount,
      lockedUntilMs: 0,
    });
  }
}

export async function adminGateClear(id: Promise<string> | string): Promise<void> {
  const key = typeof id === "string" ? id : await id;
  memMap().delete(key);

  if (isSupabaseAdminConfigured()) {
    try {
      const supabase = createSupabaseAdminClient();
      await supabase.from(TABLE).delete().eq("id", key);
    } catch (e) {
      logger.errorException("[admin-gate] クリア時 Supabase 失敗（無視）", e);
    }
  }
}

/** Client id (hash of IP + secret). */
export async function adminGateClientKey(headers: Headers): Promise<string> {
  const fwd = headers.get("x-forwarded-for");
  const ip =
    fwd
      ?.split(",")[0]
      ?.trim()
      .replace(/\s+/g, "") || headers.get("x-real-ip")?.trim() || "unknown";
  const salt = process.env.AUTH_SECRET ?? process.env.ADMIN_PANEL_SECRET ?? "reflect-admin-gate";
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest(
    "SHA-256",
    enc.encode(`admin_gate:${ip}:${salt}`),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
