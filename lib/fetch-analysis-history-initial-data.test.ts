import { describe, it, expect, vi } from "vitest";

describe("fetchAnalysisHistoryInitialData", () => {
  it("Supabase 未設定時は空のリストが返されること", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase-admin", async (importOriginal) => {
      const actual =
        await importOriginal<typeof import("@/lib/supabase-admin")>();
      return {
        ...actual,
        isSupabaseAdminConfigured: vi.fn(() => false),
      };
    });

    const { fetchAnalysisHistoryInitialData } = await import(
      "./fetch-analysis-history-initial-data"
    );

    const data = await fetchAnalysisHistoryInitialData(
      "00000000-0000-0000-0000-000000000000",
    );

    expect(data).toEqual({
      lists: {
        weekly: [],
        monthly: [],
        yearly: [],
        personality: [],
        question: [],
      },
    });
  });

  it("Supabase 設定時は type 別の履歴が返されること", async () => {
    vi.resetModules();

    const makeListQuery = (rows: unknown[] | null) => {
      const q: any = {};
      q.select = vi.fn(() => q);
      q.eq = vi.fn(() => q);
      q.order = vi.fn(() => ({ data: rows }));
      return q;
    };

    const weeklyRows = [
      {
        id: "w1",
        type: "weekly",
        period_from: "2026-01-01",
        period_to: "2026-01-07",
        payload: { weeklyInsight: "w" },
        created_at: "2026-01-08",
      },
    ];
    const monthlyRows = [
      {
        id: "m1",
        type: "monthly",
        period_from: "2026-01-01",
        period_to: "2026-01-31",
        payload: { monthlyInsight: "m" },
        created_at: "2026-02-01",
      },
    ];
    const yearlyRows = [
      {
        id: "y1",
        type: "yearly",
        period_from: "2025-02-01",
        period_to: "2026-01-31",
        payload: { emotionTrend: "y" },
        created_at: "2026-02-01",
      },
    ];
    const personalityRows = [
      {
        id: "p1",
        type: "personality",
        payload: {
          tendency: "t",
          strengthSignals: ["s"],
          riskPatterns: ["r"],
          downTriggers: "d",
          recoveryActions: "a",
        },
        created_at: "2026-01-15",
      },
    ];
    const questionRows = [
      {
        id: "q1",
        type: "question",
        payload: { questions: ["q"] },
        created_at: "2026-01-22",
      },
    ];

    const from = vi
      .fn()
      .mockReturnValueOnce(makeListQuery(weeklyRows))
      .mockReturnValueOnce(makeListQuery(monthlyRows))
      .mockReturnValueOnce(makeListQuery(yearlyRows))
      .mockReturnValueOnce(makeListQuery(personalityRows))
      .mockReturnValueOnce(makeListQuery(questionRows));

    vi.doMock("@/lib/supabase-admin", () => ({
      isSupabaseAdminConfigured: vi.fn(() => true),
      createSupabaseAdminClient: vi.fn(() => ({ from })),
    }));

    const { fetchAnalysisHistoryInitialData } = await import(
      "./fetch-analysis-history-initial-data"
    );

    const data = await fetchAnalysisHistoryInitialData(
      "00000000-0000-0000-0000-000000000000",
    );

    expect(data).toEqual({
      lists: {
        weekly: [
          {
            id: "w1",
            type: "weekly",
            period: { from: "2026-01-01", to: "2026-01-07" },
            payload: { weeklyInsight: "w" },
            createdAt: "2026-01-08",
          },
        ],
        monthly: [
          {
            id: "m1",
            type: "monthly",
            period: { from: "2026-01-01", to: "2026-01-31" },
            payload: { monthlyInsight: "m" },
            createdAt: "2026-02-01",
          },
        ],
        yearly: [
          {
            id: "y1",
            type: "yearly",
            period: { from: "2025-02-01", to: "2026-01-31" },
            payload: { emotionTrend: "y" },
            createdAt: "2026-02-01",
          },
        ],
        personality: [
          {
            id: "p1",
            type: "personality",
            payload: {
              tendency: "t",
              strengthSignals: ["s"],
              riskPatterns: ["r"],
              downTriggers: "d",
              recoveryActions: "a",
            },
            createdAt: "2026-01-15",
          },
        ],
        question: [
          {
            id: "q1",
            type: "question",
            payload: { questions: ["q"] },
            createdAt: "2026-01-22",
          },
        ],
      },
    });

    expect(from).toHaveBeenCalledTimes(5);
    expect(from).toHaveBeenNthCalledWith(1, "analysis_results");
  });
});

