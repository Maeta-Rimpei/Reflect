import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { getSubscriptionPeriodEndISO, type SubscriptionWithPeriod } from "@/lib/stripe-subscription";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import { PLAN_DEEP } from "@/constants/plan";

/**
 * Checkout 完了後にクライアントから呼ばれ、Stripe の session を検証して DB を更新する。
 * Webhook が届かないローカル開発環境でも確実にプランを反映する。
 * 本番では Webhook との二重更新になるが、冪等なので問題ない。
 */
export async function POST(req: NextRequest) {
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

  const body = (await req.json().catch(() => null)) as {
    session_id?: string;
  } | null;

  const checkoutSessionId = body?.session_id;
  if (!checkoutSessionId || typeof checkoutSessionId !== "string") {
    return NextResponse.json(
      { error: "validation", message: "session_id is required" },
      { status: 400 },
    );
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);

    // セキュリティ: checkout session が現在のユーザーのものか検証
    const csUserId = checkoutSession.metadata?.user_id ?? checkoutSession.client_reference_id;
    if (csUserId !== session.user.id) {
      return NextResponse.json(
        { error: "forbidden", message: "Session does not belong to current user" },
        { status: 403 },
      );
    }

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json(
        { error: "not_paid", message: "Payment not completed" },
        { status: 400 },
      );
    }

    const subscriptionId = checkoutSession.subscription as string | null;
    const supabase = createSupabaseAdminClient();
    const userId = session.user.id;

    // users テーブルを deep に更新
    await supabase
      .from("users")
      .update({ plan: PLAN_DEEP, updated_at: new Date().toISOString() })
      .eq("id", userId);

    // subscriptions テーブルも更新（Webhook と同じ処理、冪等）
    if (subscriptionId) {
      const sub = (await stripe.subscriptions.retrieve(
        subscriptionId,
      )) as SubscriptionWithPeriod;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      const periodEnd = getSubscriptionPeriodEndISO(sub);

      const { error: subError } = await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          status: sub.status,
          current_period_end: periodEnd,
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (subError) {
        logger.error("[stripe verify-checkout] サブスク upsert に失敗", {
          message: subError.message,
          code: subError.code,
          details: subError.details,
          userId,
          subscriptionId,
          checkoutSessionId,
        });
      }
    }

    return NextResponse.json({ plan: PLAN_DEEP });
  } catch (e) {
    logger.errorException("[stripe verify-checkout] チェックアウト検証でエラー", e, {
      userId: session.user.id,
      checkoutSessionId,
    });
    return NextResponse.json(
      { error: "internal", message: "Failed to verify checkout" },
      { status: 500 },
    );
  }
}
