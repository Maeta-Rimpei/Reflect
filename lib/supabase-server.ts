import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

/**
 * Create a Supabase client for API routes using the user's JWT.
 * RLS policies (user_id = auth.uid()) will apply.
 */
export function createSupabaseServerClient(accessToken: string): SupabaseClient {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase is not configured");
  }
  return createClient(supabaseUrl, supabasePublishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function getAccessTokenFromRequest(
  authHeader: string | null,
): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}
