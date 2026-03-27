import { describe, it, expect } from "vitest";
import { getSubscriptionPeriodEndISO } from "@/lib/stripe-subscription";

describe("getSubscriptionPeriodEndISO", () => {
  it("current_period_end が無ければ null", () => {
    expect(getSubscriptionPeriodEndISO({} as never)).toBeNull();
  });

  it("Unix 秒を ISO 文字列に変換する", () => {
    const iso = getSubscriptionPeriodEndISO({
      current_period_end: 1_700_000_000,
    } as never);
    expect(iso).toBe(new Date(1_700_000_000 * 1000).toISOString());
  });
});
