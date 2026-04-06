import { describe, it, expect } from "vitest";
import { subscriptionNeedsStripeCancel } from "@/lib/stripe-withdrawal";

describe("subscriptionNeedsStripeCancel", () => {
  it("active / trialing のとき true", () => {
    expect(subscriptionNeedsStripeCancel("active")).toBe(true);
    expect(subscriptionNeedsStripeCancel("trialing")).toBe(true);
    expect(subscriptionNeedsStripeCancel("ACTIVE")).toBe(true);
  });

  it("canceled や空のとき false", () => {
    expect(subscriptionNeedsStripeCancel("canceled")).toBe(false);
    expect(subscriptionNeedsStripeCancel("past_due")).toBe(false);
    expect(subscriptionNeedsStripeCancel(null)).toBe(false);
    expect(subscriptionNeedsStripeCancel(undefined)).toBe(false);
  });
});
