import { describe, it, expect, vi } from "vitest";
import { getTodayInTokyo, getWeekRangeInTokyo, getMonthRangeInTokyo, getLast12MonthsRangeInTokyo, getLast7DaysRangeInTokyo, getMonthLabel } from "@/lib/date-utils";

describe("getTodayInTokyo", () => {
    it("東京時間の今日の日付を返す(2026-02-22)", () => {
        vi.useFakeTimers();
        const mockDate = new Date("2026-02-22T12:00:00+09:00");
        vi.setSystemTime(mockDate);
        
        const today = getTodayInTokyo();
        expect(today).toBe("2026-02-22");
    });
});

describe("getWeekRangeInTokyo", () => {
    it("東京時間の今週の日付範囲を返す(2026-02-16～2026-02-22)", () => {
        // Dateをモックする
        vi.useFakeTimers();
        const mockDate = new Date("2026-02-22T12:00:00+09:00");
        vi.setSystemTime(mockDate);
        
        const { from, to } = getWeekRangeInTokyo();
        expect(from).toBe("2026-02-16");
        expect(to).toBe("2026-02-22");
    });
});

describe("getMonthRangeInTokyo", () => {
    it("東京時間の今月の日付範囲を返す(2026-02-01～2026-02-28)", () => {
        vi.useFakeTimers();
        const mockDate = new Date("2026-02-22T12:00:00+09:00");
        vi.setSystemTime(mockDate);
        
        const { from, to } = getMonthRangeInTokyo();
        expect(from).toBe("2026-02-01");
        expect(to).toBe("2026-02-28");
    });
});

describe("getLast12MonthsRangeInTokyo", () => {
    it("東京時間の直近12ヶ月の日付範囲を返す(2025-03-01～2026-02-28)", () => {
        vi.useFakeTimers();
        const mockDate = new Date("2026-02-22T12:00:00+09:00");
        vi.setSystemTime(mockDate);
        
        const { from, to } = getLast12MonthsRangeInTokyo();
        expect(from).toBe("2025-03-01");
        expect(to).toBe("2026-02-28");
    });
});

describe("getLast7DaysRangeInTokyo", () => {
    it("東京時間の直近7日の日付範囲を返す(2026-02-16～2026-02-22)", () => {
        vi.useFakeTimers();
        const mockDate = new Date("2026-02-22T12:00:00+09:00");
        vi.setSystemTime(mockDate);
        
        const { from, to } = getLast7DaysRangeInTokyo();
        expect(from).toBe("2026-02-16");
        expect(to).toBe("2026-02-22");
    });
});

describe("getMonthLabel", () => {
    it("YYYY-MM 形式の月ラベルを返す(2026年2月)", () => {
        expect(getMonthLabel("2026-02")).toBe("2026年2月");
    });
    it("YYYY-MM-DD 形式の月ラベルを返す(2026年2月1日)", () => {
        expect(getMonthLabel("2026-02-01")).toBe("2026年2月");
    });
    it("YYYY-MM-DD 形式の月ラベルを返す(2026年2月31日)", () => {
        expect(getMonthLabel("2026-02-31")).toBe("2026年2月");
    });
});