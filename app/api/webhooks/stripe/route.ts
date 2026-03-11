import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import {
  getSubscriptionPeriodEndISO,
  type SubscriptionWithPeriod,
} from "@/lib/stripe-subscription";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe webhook not configured" },
      { status: 503 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error("[webhook stripe] 署名検証に失敗", message);
    return NextResponse.json({ error: `Webhook signature failed: ${message}` }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Supabase admin not configured" },
      { status: 503 },
    );
  }

  const supabase = createSupabaseAdminClient();

  try {
    switch (event.type) {
      // ユーザーが Deep プラン購入の Checkout を完了した直後に Stripe から送られる。
      // users.plan を deep にし、subscriptions にサブスク情報を upsert する。
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id ?? session.client_reference_id;
        const subscriptionId = session.subscription as string | null;

        if (!userId) {
          logger.warn("[webhook stripe] checkout.session.completed に user_id がありません");
          break;
        }

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId) as SubscriptionWithPeriod;
          const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
          const periodEnd = getSubscriptionPeriodEndISO(sub);

          await supabase.from("users").update({ plan: "deep", updated_at: new Date().toISOString() }).eq("id", userId);

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
            logger.error("[webhook stripe] サブスク upsert に失敗", {
              message: subError.message,
              code: subError.code,
              details: subError.details,
            });
          }
        }
        break;
      }

      // サブスクの状態変更時に送られる（更新・更新失敗・cancel_at_period_end 設定・支払い方法変更など）。
      // subscriptions を同期し、status が active/trialing のときだけ users.plan を deep にする。
      case "customer.subscription.updated": {
        const sub = event.data.object as SubscriptionWithPeriod;
        const userId = sub.metadata?.user_id;
        const periodEnd = getSubscriptionPeriodEndISO(sub);
        const customerId = typeof sub.customer === "string" ? sub.customer : (sub.customer as { id?: string })?.id;

        const subUpdate = {
          status: sub.status,
          current_period_end: periodEnd,
          stripe_customer_id: customerId ?? null,
          updated_at: new Date().toISOString(),
        };
        const { data: updatedBySubId } = await supabase
          .from("subscriptions")
          .update(subUpdate)
          .eq("stripe_subscription_id", sub.id)
          .select("user_id")
          .maybeSingle();
        if (!updatedBySubId && userId) {
          await supabase.from("subscriptions").update(subUpdate).eq("user_id", userId);
        }

        if (sub.status === "active" || sub.status === "trialing") {
          if (userId) {
            await supabase.from("users").update({ plan: "deep", updated_at: new Date().toISOString() }).eq("id", userId);
          }
        }
        break;
      }

      // サブスクが削除されたときに送られる（解約して請求期間終了後、または即時解約時）。
      // subscriptions の status を canceled にし、current_period_end は getPlan() で「期限までは Deep」判定に使うため残す。
      case "customer.subscription.deleted": {
        const sub = event.data.object as SubscriptionWithPeriod;
        const userId = sub.metadata?.user_id;
        const periodEnd = getSubscriptionPeriodEndISO(sub);
        const updatePayload = {
          status: "canceled",
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        };
        // stripe_subscription_id で更新。一致しない場合は metadata.user_id で更新（Portal 経由などで id がずれる場合のフォールバック）
        const { data: bySubId } = await supabase
          .from("subscriptions")
          .update(updatePayload)
          .eq("stripe_subscription_id", sub.id)
          .select("user_id")
          .maybeSingle();
        if (!bySubId && userId) {
          await supabase
            .from("subscriptions")
            .update(updatePayload)
            .eq("user_id", userId);
        }
        break;
      }

      // 上記以外のイベント（invoice.paid など）は無視
      default:
        break;
    }
  } catch (e) {
    logger.errorException("[webhook stripe] ハンドラでエラー", e);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
