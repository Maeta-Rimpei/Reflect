/**
 * ジャーナル（今日のふりかえり）ページの初回表示用データをサーバー側で取得する。
 */
import {
  getLastNDaysRangeInTokyo,
  getTodayInTokyo,
  getWeekRangeInTokyo,
} from "@/lib/date-utils";
import type {
  JournalAnalysis,
  JournalInitialData,
  TodayEntry,
  WeekDayItem,
} from "@/types/journal";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function normalizeAnalysis(p: unknown): JournalAnalysis | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  const summary = typeof o.summary === "string" ? o.summary : "";
  const primaryEmotion = typeof o.primaryEmotion === "string" ? o.primaryEmotion : "";
  const secondaryEmotion = typeof o.secondaryEmotion === "string" ? o.secondaryEmotion : "";
  const thoughtPatterns = Array.isArray(o.thoughtPatterns)
    ? o.thoughtPatterns.map(String).filter(Boolean)
    : [];
  const tension = typeof o.tension === "string" ? o.tension : "";
  const metaInsight = typeof o.metaInsight === "string" ? o.metaInsight : "";
  const question = typeof o.question === "string" ? o.question : "";
  const hasAny =
    summary || primaryEmotion || secondaryEmotion || thoughtPatterns.length > 0 || tension || metaInsight || question;
  if (!hasAny) return null;
  return {
    summary,
    primaryEmotion,
    secondaryEmotion,
    thoughtPatterns,
    tension,
    metaInsight,
    question,
  };
}

/**
 * 今週のカレンダー・今日のエントリ・日次分析・プランを取得する。
 * Deep 時は options.deepStreakDates を渡すとその日付で継続日数を計算する（内部で 365 日 fetch しない）。
 */
export async function fetchJournalInitialData(
  baseUrl: string,
  cookieHeader: string,
  options?: { deepStreakDates?: string[] },
): Promise<JournalInitialData> {
  const today = getTodayInTokyo();
  const { from, to } = getWeekRangeInTokyo();
  const headers = { Cookie: cookieHeader };

  const [calRes, entryRes, analysisRes, meRes] = await Promise.all([
    fetch(`${baseUrl}/api/v1/calendar?from=${from}&to=${to}`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/v1/entries?from=${today}&to=${today}`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/v1/analysis?type=daily&from=${today}&to=${today}`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/v1/me`, { headers, cache: "no-store" }),
  ]);

  const meData = meRes.ok ? ((await meRes.json()) as { plan?: "free" | "deep" }) : null;
  const plan: "free" | "deep" = meData?.plan === "deep" ? "deep" : "free";

  const toDateOnly = (d: string) => String(d).slice(0, 10);
  const calData = (calRes.ok ? await calRes.json() : { dates: [] }) as { dates?: string[] };
  const weekDates = new Set((calData.dates ?? []).map(toDateOnly));
  const [fy, fm, fd] = from.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const weekDays: WeekDayItem[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(fy, fm - 1, fd + i);
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    weekDays.push({
      day: WEEKDAY_LABELS[d.getDay()],
      done: weekDates.has(dateStr),
      today: dateStr === today,
    });
  }

  let streakDates: string[];
  if (plan === "deep" && options?.deepStreakDates != null) {
    streakDates = options.deepStreakDates;
  } else if (plan === "deep") {
    const { from: from365, to: to365 } = getLastNDaysRangeInTokyo(366);
    const cal365Res = await fetch(
      `${baseUrl}/api/v1/calendar?from=${from365}&to=${to365}`,
      { headers, cache: "no-store" },
    );
    const cal365 = cal365Res.ok
      ? ((await cal365Res.json()) as { dates?: string[] })
      : { dates: [] };
    streakDates = (cal365.dates ?? []).map(toDateOnly);
  } else {
    streakDates = Array.from(weekDates);
  }

  let todayEntry: TodayEntry | null = null;
  let analysis: JournalAnalysis | null = null;

  if (entryRes.ok) {
    const entries = (await entryRes.json()) as Array<{ body?: string; mood?: string | null }>;
    if (Array.isArray(entries) && entries.length > 0) {
      const e = entries[0];
      todayEntry = { body: e.body ?? "", mood: e.mood ?? null };
      if (analysisRes.ok) {
        const list = (await analysisRes.json()) as Array<{ payload?: unknown }>;
        analysis = normalizeAnalysis(list?.[0]?.payload);
      }
    }
  }

  return {
    weekDays,
    streakDates,
    todayEntry,
    analysis,
    plan,
  };
}
