import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { getPlan } from "@/lib/get-plan";
import type { ServerProfile } from "@/types/profile";
import { PLAN_FREE } from "@/constants/plan";

/**
 * サーバー側で現在のユーザーのプロフィール（plan, email, name）を取得する。
 * 未認証・論理削除済み・Supabase 未設定時はデフォルト値を返す。plan は getPlan で取得。
 */
export async function getProfile(): Promise<ServerProfile> {
  const defaultProfile: ServerProfile = {
    plan: PLAN_FREE,
    email: null,
    name: null,
  };

  if (!isSupabaseAdminConfigured()) {
    return defaultProfile;
  }

  const session = await auth();
  if (!session?.user?.id) {
    return defaultProfile;
  }

  const userId = session.user.id;
  const email = session.user.email ?? null;
  const name = session.user.name ?? null;

  try {
    const supabase = createSupabaseAdminClient();
    const { data: existing } = await supabase
      .from("users")
      .select("id, deleted_at")
      .eq("id", userId)
      .maybeSingle();

    if ((existing as { deleted_at?: string | null } | null)?.deleted_at) {
      return defaultProfile;
    }

    if (existing) {
      await supabase
        .from("users")
        .update({ email, name, updated_at: new Date().toISOString() })
        .eq("id", userId);
    } else {
      await supabase.from("users").insert({
        id: userId,
        email,
        name,
        plan: PLAN_FREE,
        updated_at: new Date().toISOString(),
      });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("email, name")
      .eq("id", userId)
      .single();

    const plan = await getPlan();

    return {
      plan,
      email: profile?.email ?? email ?? null,
      name: profile?.name ?? name ?? null,
    };
  } catch {
    return defaultProfile;
  }
}
