import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getJournalRegenerationBLimit,
  getJournalRegenerationBUsed,
  getJournalRegenerationBRemaining,
  incrementJournalRegenerationB,
} from "@/lib/quota-usage";
import { QUOTA_KEY_JOURNAL_DAILY_REGENERATION_B } from "@/lib/quota-constants";

vi.mock("@/lib/date-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/date-utils")>();
  return {
    ...actual,
    getYearMonthInTokyo: () => "2025-03",
  };
});

function mockSelectChain(row: { used_count: number } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row });
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle,
  };
}

describe("getJournalRegenerationBLimit", () => {
  it("quota-constants と一致", () => {
    expect(getJournalRegenerationBLimit()).toBe(3);
  });
});

describe("getJournalRegenerationBUsed", () => {
  it("used_count を返す", async () => {
    const chain = mockSelectChain({ used_count: 2 });
    const supabase = {
      from: vi.fn(() => chain),
    } as unknown as SupabaseClient;

    const used = await getJournalRegenerationBUsed(supabase, "user-1");
    expect(used).toBe(2);
    expect(supabase.from).toHaveBeenCalledWith("quota_usage");
    expect(chain.eq).toHaveBeenCalledWith(
      "quota_key",
      QUOTA_KEY_JOURNAL_DAILY_REGENERATION_B,
    );
    expect(chain.eq).toHaveBeenCalledWith("period", "2025-03");
  });

  it("行が無ければ 0", async () => {
    const chain = mockSelectChain(null);
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient;
    expect(await getJournalRegenerationBUsed(supabase, "u")).toBe(0);
  });
});

describe("getJournalRegenerationBRemaining", () => {
  it("上限から使用分を引く", async () => {
    const chain = mockSelectChain({ used_count: 1 });
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient;
    expect(await getJournalRegenerationBRemaining(supabase, "u")).toBe(2);
  });
});

describe("incrementJournalRegenerationB", () => {
  let upsert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    upsert = vi.fn().mockResolvedValue({ error: null });
  });

  it("used+1 で upsert する", async () => {
    const chain = mockSelectChain({ used_count: 1 });
    let fromCalls = 0;
    const supabase = {
      from: vi.fn(() => {
        fromCalls++;
        if (fromCalls === 1) return chain;
        return { upsert };
      }),
    } as unknown as SupabaseClient;

    await incrementJournalRegenerationB(supabase, "user-1");

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        used_count: 2,
        quota_key: QUOTA_KEY_JOURNAL_DAILY_REGENERATION_B,
        period: "2025-03",
      }),
      { onConflict: "user_id,quota_key,period" },
    );
  });

  it("DB エラーは throw", async () => {
    const chain = mockSelectChain({ used_count: 0 });
    upsert = vi.fn().mockResolvedValue({
      error: { message: "fail", code: "x" },
    });
    let fromCalls = 0;
    const supabase = {
      from: vi.fn(() => {
        fromCalls++;
        if (fromCalls === 1) return chain;
        return { upsert };
      }),
    } as unknown as SupabaseClient;

    await expect(incrementJournalRegenerationB(supabase, "u")).rejects.toEqual({
      message: "fail",
      code: "x",
    });
  });
});
