import { describe, it, expect, vi } from "vitest";

describe("fetchAnalysisInitialData", () => {
  it("Supabase 未設定時は空のオブジェクトが返されること", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase-admin", async (importOriginal) => {
      const actual =
        await importOriginal<typeof import("@/lib/supabase-admin")>();
      return {
        ...actual,
        isSupabaseAdminConfigured: vi.fn(() => false),
      };
    });

    const { fetchAnalysisInitialData } = await import("./fetch-analysis-initial-data");
    const data = await fetchAnalysisInitialData(
      "00000000-0000-0000-0000-000000000000",
    );
    expect(data).toBeDefined();
    expect(data).toEqual({
      weeklyReport: null,
      monthlyReport: null,
      yearlyReport: null,
      personalitySummary: null,
      questions: [],
    });
  });

  it("Supabase 設定時はsupabaseから取得したデータが返されること", async () => {
    vi.resetModules();

    const makeQuery = (data: unknown) => {
      const q: any = {};
      q.select = vi.fn(() => q);
      q.eq = vi.fn(() => q);
      q.gte = vi.fn(() => q);
      q.lt = vi.fn(() => q);
      q.order = vi.fn(() => q);
      q.limit = vi.fn(() => q);
      q.maybeSingle = vi.fn(() => ({ data }));
      return q;
    };

    const weeklyRow = {
      id: "w1",
      period_from: "2026-01-01",
      period_to: "2026-01-07",
      payload: { summary: "test-weekly" },
      created_at: "2026-01-08",
    };
    const monthlyRow = {
      id: "m1",
      period_from: "2026-01-01",
      period_to: "2026-01-31",
      payload: { summary: "test-monthly" },
      created_at: "2026-02-01",
    };
    const yearlyRow = {
      id: "y1",
      period_from: "2025-02-01",
      period_to: "2026-01-31",
      payload: { summary: "test-yearly" },
      created_at: "2026-02-01",
    };
    const personalityRow = {
      payload: {
        tendency: "test",
        strengthSignals: ["test"],
        riskPatterns: ["test"],
        downTriggers: "test",
        recoveryActions: "test",
      },
      created_at: "2026-01-01",
    };
    const questionRow = { payload: { questions: ["q1", "q2"] } };

    const from = vi
      .fn()
      .mockReturnValueOnce(makeQuery(weeklyRow))
      .mockReturnValueOnce(makeQuery(monthlyRow))
      .mockReturnValueOnce(makeQuery(yearlyRow))
      .mockReturnValueOnce(makeQuery(personalityRow))
      .mockReturnValueOnce(makeQuery(questionRow));

    vi.doMock("@/lib/supabase-admin", () => ({
      isSupabaseAdminConfigured: vi.fn(() => true),
      createSupabaseAdminClient: vi.fn(() => ({ from })),
    }));

    const { fetchAnalysisInitialData } = await import("./fetch-analysis-initial-data");
    const data = await fetchAnalysisInitialData(
      "00000000-0000-0000-0000-000000000000",
    );
    expect(data).toBeDefined();
    expect(data).toEqual({
      weeklyReport: {
        period: {
          from: "2026-01-01",
          to: "2026-01-07",
        },
        payload: {
          summary: "test-weekly",
        },
      },
      monthlyReport: {
        period: {
          from: "2026-01-01",
          to: "2026-01-31",
        },
        payload: {
          summary: "test-monthly",
        },
      },
      yearlyReport: {
        period: {
          from: "2025-02-01",
          to: "2026-01-31",
        },
        payload: {
          summary: "test-yearly",
        },
      },
      personalitySummary: {
        tendency: "test",
        strengthSignals: ["test"],
        riskPatterns: ["test"],
        downTriggers: "test",
        recoveryActions: "test",
        updatedAt: "2026-01-01",
      },
      questions: ["q1", "q2"],
    });
  });
});