/**
 * 履歴ページの初回表示用データをサーバー側で取得する。
 * Supabase を直接利用する。
 */
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { decrypt, isEncryptionConfigured } from "@/lib/crypto";
import {
  getLast7DaysRangeInTokyo,
  getNextDay,
  getTodayPartsInTokyo,
  toYmdInTokyo,
} from "@/lib/date-utils";
import {
  getJournalRegenerationBLimit,
  getJournalRegenerationBRemaining,
} from "@/lib/quota-usage";
import { FREE_PLAN_HISTORY_DAYS } from "@/constants/limits";
import { PLAN_DEEP, PLAN_FREE } from "@/constants/plan";
import type {
  EntryItem,
  EmotionRow,
  FetchHistoryRangeParams,
  HistoryInitialData,
} from "@/types/entry";
import type { Plan } from "@/types/plan";

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toYYYYMMDD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getViewPrefix(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-`;
}

function parseEntryDatesFromCalendar(
  calendarDates: string[] | undefined,
  viewYear: number,
  viewMonth: number,
): number[] {
  const prefix = getViewPrefix(viewYear, viewMonth);
  const dates = new Set<number>();
  for (const d of calendarDates ?? []) {
    const dateStr = String(d);
    if (!dateStr.startsWith(prefix)) continue;
    const day = parseInt(dateStr.slice(8, 10), 10);
    if (!Number.isNaN(day)) dates.add(day);
  }
  return [...dates];
}

function toYYYYMMDDFromUnknown(v: unknown): string {
  if (v == null || v === "") return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(v as string | number | Date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

/**
 * 指定範囲の履歴データを取得。Free プランで範囲が 7 日超の場合は直近 7 日でフォールバックする。
 * @param userId - 認証済みユーザー ID
 */
export async function fetchHistoryRangeData(
  userId: string,
  params: FetchHistoryRangeParams,
): Promise<
  Omit<HistoryInitialData, "viewMonth" | "viewYear"> & {
    viewMonth: number;
    viewYear: number;
  }
> {
  const { from: fromParam, to: toParam, viewMonth, viewYear } = params;
  const empty = {
    entries: [] as EntryItem[],
    emotions: [] as EmotionRow[],
    entryDates: [] as number[],
    isFreeLimit: false,
    viewMonth,
    viewYear,
    plan: PLAN_FREE,
    journalRegenerationBRemaining: 0,
    journalRegenerationBLimit: getJournalRegenerationBLimit(),
  };

  if (!isSupabaseAdminConfigured()) {
    return empty;
  }

  const supabase = createSupabaseAdminClient();

  const { data: profile } = await supabase
    .from("users")
    .select("plan")
    .eq("id", userId)
    .single();
  const plan: Plan =
    profile?.plan === PLAN_DEEP || profile?.plan === PLAN_FREE
      ? profile.plan
      : PLAN_FREE;

  const journalRegenerationBRemaining = await getJournalRegenerationBRemaining(
    supabase,
    userId,
  );

  const fromDate = new Date(fromParam);
  const toDate = new Date(toParam);
  const rangeDays =
    Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) +
    1;
  const isFreeLimit =
    plan === PLAN_FREE && rangeDays > FREE_PLAN_HISTORY_DAYS;

  const actualFrom = isFreeLimit
    ? getLast7DaysRangeInTokyo().from
    : fromParam;
  const actualTo = isFreeLimit ? getLast7DaysRangeInTokyo().to : toParam;

  const { data: entriesRows, error: entriesError } = await supabase
    .from("entries")
    .select("id, body, posted_at, created_at")
    .eq("user_id", userId)
    .gte("posted_at", actualFrom)
    .lt("posted_at", getNextDay(actualTo))
    .order("posted_at", { ascending: false });

  if (entriesError || !entriesRows?.length) {
    return {
      ...empty,
      isFreeLimit,
      plan,
      journalRegenerationBRemaining,
      journalRegenerationBLimit: getJournalRegenerationBLimit(),
    };
  }

  const entryIds = entriesRows.map((e) => e.id);
  const [moodsRes, tagsRes, dailyRes] = await Promise.all([
    supabase
      .from("moods")
      .select("entry_id, value")
      .eq("user_id", userId)
      .in("entry_id", entryIds),
    supabase
      .from("emotion_tags")
      .select("entry_id, tag, created_at")
      .eq("user_id", userId)
      .in("entry_id", entryIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("analysis_results")
      .select("period_from, payload")
      .eq("user_id", userId)
      .eq("type", "daily")
      .gte("period_from", actualFrom)
      .lte("period_from", actualTo),
  ]);

  const dailyByYmd = new Map<string, Record<string, unknown>>();
  for (const r of dailyRes.data ?? []) {
    const ymd = String((r as { period_from: string }).period_from).slice(0, 10);
    if (!dailyByYmd.has(ymd) && r.payload) {
      dailyByYmd.set(ymd, r.payload as Record<string, unknown>);
    }
  }

  const moodsByEntry = new Map<string, string>();
  for (const m of moodsRes.data ?? []) {
    moodsByEntry.set(m.entry_id, m.value);
  }

  const entries: EntryItem[] = entriesRows.map((e) => {
    const plainBody = isEncryptionConfigured() ? decrypt(e.body) : e.body;
    const ymd = toYmdInTokyo(e.posted_at);
    const raw = dailyByYmd.get(ymd);
    return {
      id: e.id,
      body: plainBody ?? "",
      wordCount: (plainBody ?? "").length,
      postedAt: e.posted_at,
      createdAt: e.created_at,
      mood: moodsByEntry.get(e.id) ?? null,
      hasDailyAnalysis: dailyByYmd.has(ymd),
      dailyAnalysis: raw
        ? {
            summary: typeof raw.summary === "string" ? raw.summary : "",
            primaryEmotion: typeof raw.primaryEmotion === "string" ? raw.primaryEmotion : "",
            secondaryEmotion: typeof raw.secondaryEmotion === "string" ? raw.secondaryEmotion : "",
            thoughtPatterns: Array.isArray(raw.thoughtPatterns) ? raw.thoughtPatterns.map(String) : [],
            tension: typeof raw.tension === "string" ? raw.tension : "",
            metaInsight: typeof raw.metaInsight === "string" ? raw.metaInsight : "",
            question: typeof raw.question === "string" ? raw.question : "",
          }
        : null,
    };
  });

  const rawDates = entriesRows.map((r) =>
    toYYYYMMDDFromUnknown((r as { posted_at: unknown }).posted_at),
  );
  const dates = [...new Set(rawDates.filter(Boolean))];
  const entryDates = parseEntryDatesFromCalendar(
    dates,
    viewYear,
    viewMonth,
  );

  const entryByPost = new Map(entriesRows.map((e) => [e.id, e.posted_at]));
  const byDate = new Map<
    string,
    { date: string; mood: string | null; tags: string[] }
  >();
  for (const entry of entriesRows) {
    const postedAt = entry.posted_at;
    if (!byDate.has(postedAt)) {
      byDate.set(postedAt, {
        date: postedAt,
        mood: moodsByEntry.get(entry.id) ?? null,
        tags: [],
      });
    }
  }
  for (const t of tagsRes.data ?? []) {
    const postedAt = entryByPost.get(t.entry_id);
    if (!postedAt) continue;
    const row = byDate.get(postedAt);
    if (row && !row.tags.includes(t.tag)) {
      row.tags.push(t.tag);
    }
  }
  const emotions: EmotionRow[] = [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, v]) => v);

  return {
    entries,
    emotions,
    entryDates,
    isFreeLimit,
    viewMonth,
    viewYear,
    plan,
    journalRegenerationBRemaining,
    journalRegenerationBLimit: getJournalRegenerationBLimit(),
  };
}

/**
 * 履歴ページ用の初期データを取得。今月を要求し、Free の場合は直近 7 日にフォールバックする。
 */
export async function fetchHistoryInitialData(
  userId: string,
): Promise<HistoryInitialData> {
  const { year: viewYear, month: viewMonth } = getTodayPartsInTokyo();
  const fromParam = toYYYYMMDD(viewYear, viewMonth, 1);
  const lastDay = getDaysInMonth(viewMonth, viewYear);
  const toParam = toYYYYMMDD(viewYear, viewMonth, lastDay);
  return fetchHistoryRangeData(userId, {
    from: fromParam,
    to: toParam,
    viewMonth,
    viewYear,
  });
}
