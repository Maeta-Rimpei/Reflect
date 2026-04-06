import Stripe from "stripe";
import { isStripeSubscriptionBillingActiveStatus } from "@/constants/stripe-subscription";

/**
 * DB の subscriptions.status が Stripe 上で解約 API が必要な状態か。
 */
export function subscriptionNeedsStripeCancel(
  status: string | null | undefined,
): boolean {
  if (!status) return false;
  return isStripeSubscriptionBillingActiveStatus(status.toLowerCase());
}

/**
 * 退会時に Stripe サブスクを即時解約する。既に削除済み・解約済みなら成功扱い。
 */
export async function cancelStripeSubscriptionForWithdrawal(
  stripe: Stripe,
  subscriptionId: string,
): Promise<void> {
  try {
    await stripe.subscriptions.cancel(subscriptionId);
  } catch (e) {
    if (isStripeCancelAlreadyDone(e)) return;
    throw e;
  }
}

function isStripeCancelAlreadyDone(e: unknown): boolean {
  if (!(e instanceof Stripe.errors.StripeError)) return false;
  if (e.code === "resource_missing") return true;
  if (e.statusCode === 404) return true;
  const msg = e.message.toLowerCase();
  if (msg.includes("already canceled") || msg.includes("already cancelled")) {
    return true;
  }
  return false;
}
