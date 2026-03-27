import { describe, it, expect } from "vitest";
import {
  QUOTA_KEY_JOURNAL_DAILY_REGENERATION_B,
  JOURNAL_DAILY_REGENERATION_B_MONTHLY_LIMIT,
} from "@/lib/quota-constants";

describe("quota-constants", () => {
  it("quota_key は固定文字列", () => {
    expect(QUOTA_KEY_JOURNAL_DAILY_REGENERATION_B).toBe(
      "journal_daily_regeneration_b",
    );
  });

  it("月次上限は正の整数", () => {
    expect(JOURNAL_DAILY_REGENERATION_B_MONTHLY_LIMIT).toBeGreaterThan(0);
  });
});
