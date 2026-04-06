import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// integration.md 方針: Secret key (sb_secret_xxx) を使用。未設定時はレガシー service_role をフォールバック。
const adminKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Supabase client with elevated key. Bypasses RLS.
 * Use only in server-side code (e.g. webhooks), never expose to the client.
 * Prefer SUPABASE_SECRET_KEY (Secret key); SUPABASE_SERVICE_ROLE_KEY is legacy.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  if (!supabaseUrl || !adminKey) {
    // middleware(Edge) から auth 経由でこのモジュールが読み込まれるため @/lib/logger は使わない（path/fs を引かない）
    console.error("[supabase-admin] 管理クライアントを作成できない", {
      hasUrl: Boolean(supabaseUrl),
      hasAdminKey: Boolean(adminKey),
    });
    throw new Error(
      "Supabase admin: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required",
    );
  }
  return createClient(supabaseUrl, adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(supabaseUrl && adminKey);
}
