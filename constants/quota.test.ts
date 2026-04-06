import { describe, it, expect } from "vitest";
import {
  QUOTA_KEY_MONTHLY_DAILY_JOURNAL_REGENERATION,
  DAILY_JOURNAL_REGENERATION_MONTHLY_LIMIT,
} from "@/constants/quota";

describe("constants/quota", () => {
  it("quota_key は DB と一致する固定文字列", () => {
    expect(QUOTA_KEY_MONTHLY_DAILY_JOURNAL_REGENERATION).toBe(
      "monthly_daily_journal_regeneration",
    );
  });

  it("月次上限は正の整数", () => {
    expect(DAILY_JOURNAL_REGENERATION_MONTHLY_LIMIT).toBeGreaterThan(0);
  });
});
