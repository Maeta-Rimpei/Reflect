import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";

/**
 * サーバー側で現在のユーザーのプランを取得する。
 * 未認証・Supabase 未設定時は "free" を返す。
 * AppShell などに渡してクライアントの /api/v1/me 初回 fetch を省略するために使う。
 */
export async function getPlan(): Promise<"free" | "deep"> {
  if (!isSupabaseAdminConfigured()) {
    return "free";
  }

  const session = await auth();
  if (!session?.user?.id) {
    return "free";
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
      return "free";
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
        plan: "free",
        updated_at: new Date().toISOString(),
      });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("plan, deleted_at")
      .eq("id", userId)
      .single();

    if ((profile as { deleted_at?: string | null } | null)?.deleted_at) {
      return "free";
    }

    let plan: "free" | "deep" =
      profile?.plan === "deep" || profile?.plan === "free" ? profile.plan : "free";

    // Deep 解約後は請求期間終了（月跨ぎ）まで Deep のまま。期間を過ぎたら Free に更新
    if (plan === "deep") {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", userId)
        .maybeSingle();

      const row = sub as { status?: string; current_period_end?: string | null } | null;
      if (row?.status === "canceled" && row?.current_period_end) {
        if (new Date(row.current_period_end) < new Date()) {
          await supabase
            .from("users")
            .update({ plan: "free", updated_at: new Date().toISOString() })
            .eq("id", userId);
          plan = "free";
        }
      }
    }

    return plan;
  } catch {
    return "free";
  }
}
