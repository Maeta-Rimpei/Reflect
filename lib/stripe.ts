import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey && process.env.NODE_ENV === "production") {
  throw new Error("STRIPE_SECRET_KEY is required in production");
}

export const stripe =
  typeof secretKey === "string" && secretKey.length > 0
    ? new Stripe(secretKey)
    : null;

export const STRIPE_DEEP_PRICE_ID = process.env.STRIPE_DEEP_PRICE_ID ?? "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
      STRIPE_DEEP_PRICE_ID,
  );
}
