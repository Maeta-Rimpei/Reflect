import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import type { Plan } from "@/types/plan";
import { PLAN_DEEP, PLAN_FREE } from "@/constants/plan";
import { SUBSCRIPTION_ROW_STATUS_CANCELED } from "@/constants/stripe-subscription";

/**
 * サーバー側で現在のユーザーのプランを取得する。
 * 未認証・Supabase 未設定時は free を返す。
 * AppShell などに渡してクライアントの /api/v1/me 初回 fetch を省略するために使う。
 */
export async function getPlan(): Promise<Plan> {
  if (!isSupabaseAdminConfigured()) {
    return PLAN_FREE;
  }

  const session = await auth();
  if (!session?.user?.id) {
    return PLAN_FREE;
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
      return PLAN_FREE;
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
      .select("plan, deleted_at")
      .eq("id", userId)
      .single();

    if ((profile as { deleted_at?: string | null } | null)?.deleted_at) {
      return PLAN_FREE;
    }

    let plan: Plan =
      profile?.plan === PLAN_DEEP || profile?.plan === PLAN_FREE
        ? profile.plan
        : PLAN_FREE;

    // Deep 解約後は請求期間終了（月跨ぎ）まで Deep のまま。期間を過ぎたら Free に更新
    if (plan === PLAN_DEEP) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", userId)
        .maybeSingle();

      const row = sub as { status?: string; current_period_end?: string | null } | null;
      if (
        row?.status === SUBSCRIPTION_ROW_STATUS_CANCELED &&
        row?.current_period_end
      ) {
        if (new Date(row.current_period_end) < new Date()) {
          await supabase
            .from("users")
            .update({ plan: PLAN_FREE, updated_at: new Date().toISOString() })
            .eq("id", userId);
          plan = PLAN_FREE;
        }
      }
    }

    return plan;
  } catch {
    return PLAN_FREE;
  }
}
