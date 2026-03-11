import type Stripe from "stripe";

/** Stripe API の Subscription に存在する current_period_end（型定義に含まれない場合用） */
export type SubscriptionWithPeriod = Stripe.Subscription & { current_period_end?: number };

export function getSubscriptionPeriodEndISO(sub: SubscriptionWithPeriod): string | null {
  if (sub.current_period_end == null) return null;
  return new Date(sub.current_period_end * 1000).toISOString();
}
