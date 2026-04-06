import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { getSubscriptionPeriodEndISO, type SubscriptionWithPeriod } from "@/lib/stripe-subscription";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import { PLAN_DEEP, PLAN_FREE } from "@/constants/plan";
import { isStripeSubscriptionBillingActiveStatus } from "@/constants/stripe-subscription";

/**
 * Stripe のサブスクリプション状態を DB に同期する。
 * Webhook が届かないローカル環境でも、解約やステータス変更を反映できる。
 */
export async function POST() {
  if (!isSupabaseAdminConfigured() || !isStripeConfigured() || !stripe) {
    return NextResponse.json(
      { error: "unavailable", message: "Not configured" },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authorization required" },
      { status: 401 },
    );
  }

  const userId = session.user.id;

  try {
    const supabase = createSupabaseAdminClient();

    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .single();

    if (!subRow?.stripe_subscription_id) {
      // サブスクリプションレコードがなければ free を保証
      await supabase
        .from("users")
        .update({ plan: PLAN_FREE, updated_at: new Date().toISOString() })
        .eq("id", userId);
      return NextResponse.json({ plan: PLAN_FREE });
    }

    const sub = (await stripe.subscriptions.retrieve(
      subRow.stripe_subscription_id,
    )) as SubscriptionWithPeriod;

    const isActive = isStripeSubscriptionBillingActiveStatus(sub.status);
    const newPlan = isActive ? PLAN_DEEP : PLAN_FREE;

    await supabase
      .from("users")
      .update({ plan: newPlan, updated_at: new Date().toISOString() })
      .eq("id", userId);

    const periodEnd = getSubscriptionPeriodEndISO(sub);

    await supabase
      .from("subscriptions")
      .update({
        status: sub.status,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return NextResponse.json({ plan: newPlan, status: sub.status });
  } catch (e) {
    logger.errorException("[stripe sync-subscription] サブスク同期でエラー", e, {
      userId,
    });
    return NextResponse.json(
      { error: "internal", message: "Failed to sync subscription" },
      { status: 500 },
    );
  }
}
