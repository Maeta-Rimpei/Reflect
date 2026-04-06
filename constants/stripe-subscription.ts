/**
 * Stripe / DB subscriptions.status で「課金中・有効」とみなす値。
 * 退会時の即時解約対象の判定に使う。
 */
export const STRIPE_SUBSCRIPTION_ACTIVE_STATUSES = ["active", "trialing"] as const;

const ACTIVE_STATUS_SET = new Set<string>(STRIPE_SUBSCRIPTION_ACTIVE_STATUSES);

/** Stripe API の subscription.status が課金・利用可能な状態か */
export function isStripeSubscriptionBillingActiveStatus(status: string): boolean {
  return ACTIVE_STATUS_SET.has(status);
}

/** Webhook `customer.subscription.deleted` 後に DB に保存する status */
export const SUBSCRIPTION_ROW_STATUS_CANCELED = "canceled" as const;
