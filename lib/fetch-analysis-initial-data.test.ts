import { describe, it, expect } from "vitest";
import { fetchAnalysisInitialData } from "./fetch-analysis-initial-data";

describe("fetchAnalysisInitialData", () => {
  it("returns shape without plan (Supabase 未設定時は空のオブジェクト)", async () => {
    const data = await fetchAnalysisInitialData(
      "00000000-0000-0000-0000-000000000000",
    );
    expect(data).toBeDefined();
    expect(data).toHaveProperty("weeklyReport");
    expect(data).toHaveProperty("monthlyReport");
    expect(data).toHaveProperty("yearlyReport");
    expect(data).toHaveProperty("personalitySummary");
    expect(data).toHaveProperty("questions");
    expect(Array.isArray(data.questions)).toBe(true);
  });
});

