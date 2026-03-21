import { describe, it, expect, vi } from "vitest";

describe("fetchEmotionsInitialData", () => {
    it("Supabase 未設定時は感情ログが空であること", async () => {
        vi.resetModules();
        vi.doMock("@/lib/supabase-admin", async (importOriginal) => {
            const actual =
                await importOriginal<typeof import("@/lib/supabase-admin")>();
            return {
                ...actual,
                isSupabaseAdminConfigured: vi.fn(() => false),
            };
        });

        const { fetchEmotionsInitialData } = await import('@/lib/fetch-emotions-initial-data');
        const actual = await fetchEmotionsInitialData('00000000-0000-0000-0000-000000000000');
        
        expect(actual).toEqual({
            emotionLog: [],
        });
    });

    it("Supabase 設定時は感情ログが返されること", async () => {
        vi.resetModules();
        vi.doMock("@/lib/supabase-admin", async () => {
            const entriesChain = {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        gte: vi.fn().mockReturnValue({
                            lt: vi.fn().mockResolvedValue({
                                data: [{ id: "1", posted_at: "2026-01-01" }],
                            }),
                        }),
                    }),
                }),
            };
            const tagsChain = {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        in: vi.fn().mockReturnValue({
                            order: vi.fn().mockResolvedValue({ data: [] }),
                        }),
                    }),
                }),
            };
            const moodsChain = {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        in: vi.fn().mockResolvedValue({ data: [] }),
                    }),
                }),
            };
            return {
                createSupabaseAdminClient: vi.fn().mockReturnValue({
                    from: vi.fn((table: string) => {
                        if (table === "entries") return entriesChain;
                        if (table === "emotion_tags") return tagsChain;
                        if (table === "moods") return moodsChain;
                        return entriesChain;
                    }),
                }),
                isSupabaseAdminConfigured: vi.fn(() => true),
            };
        });

        const { fetchEmotionsInitialData } = await import('@/lib/fetch-emotions-initial-data');
        const actual = await fetchEmotionsInitialData('00000000-0000-0000-0000-000000000000');
        expect(actual).toEqual({
            emotionLog: [{ date: '2026-01-01', mood: null, tags: [] }],
        });
    });
})