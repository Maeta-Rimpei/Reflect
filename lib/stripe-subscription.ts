import type { SubscriptionWithPeriod } from "@/types/stripe";

export type { SubscriptionWithPeriod };

/**
 * サブスクリプションの終了日を ISO 形式で返す
 * @param sub Stripe の Subscription オブジェクト
 * @returns サブスクリプションの終了日（ISO 形式）
 */
export function getSubscriptionPeriodEndISO(sub: SubscriptionWithPeriod): string | null {
  if (sub.current_period_end == null) return null;
  return new Date(sub.current_period_end * 1000).toISOString();
}
