/**
 * ジャーナル（今日のふりかえり）ページの初回表示用データをサーバー側で取得する。
 * Supabase を直接利用する。
 */
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { decrypt, isEncryptionConfigured } from "@/lib/crypto";
import {
  getLastNDaysRangeInTokyo,
  getNextDay,
  getTodayInTokyo,
  getWeekRangeInTokyo,
} from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import {
  getJournalRegenerationBLimit,
  getJournalRegenerationBRemaining,
} from "@/lib/quota-usage";
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
  const primaryEmotion =
    typeof o.primaryEmotion === "string" ? o.primaryEmotion : "";
  const secondaryEmotion =
    typeof o.secondaryEmotion === "string" ? o.secondaryEmotion : "";
  const thoughtPatterns = Array.isArray(o.thoughtPatterns)
    ? o.thoughtPatterns.map(String).filter(Boolean)
    : [];
  const tension = typeof o.tension === "string" ? o.tension : "";
  const metaInsight = typeof o.metaInsight === "string" ? o.metaInsight : "";
  const question = typeof o.question === "string" ? o.question : "";
  const hasAny =
    summary ||
    primaryEmotion ||
    secondaryEmotion ||
    thoughtPatterns.length > 0 ||
    tension ||
    metaInsight ||
    question;
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

function toDateOnly(d: string) {
  return String(d).slice(0, 10);
}

/**
 * 今週のカレンダー・今日のエントリ・日次分析・プランを取得する。Supabase を直接利用する。
 * ユーザーが未存在の場合は users に挿入する。
 */
export async function fetchJournalInitialData(
  userId: string,
  email: string | null,
  name: string | null,
): Promise<JournalInitialData> {
  const today = getTodayInTokyo();
  const { from: weekFrom, to: weekTo } = getWeekRangeInTokyo();

  const defaultData: JournalInitialData = {
    weekDays: [],
    streakDates: [],
    todayEntry: null,
    analysis: null,
    plan: "free",
    hasDailyAnalysis: false,
    journalRegenerationBRemaining: 0,
    journalRegenerationBLimit: getJournalRegenerationBLimit(),
  };

  if (!isSupabaseAdminConfigured()) {
    return defaultData;
  }

  const supabase = createSupabaseAdminClient();

  const { data: existing } = await supabase
    .from("users")
    .select("id, plan")
    .eq("id", userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("users")
      .update({ email, name, updated_at: new Date().toISOString() })
      .eq("id", userId);
  } else {
    const { error } = await supabase.from("users").insert({
      id: userId,
      email,
      name,
      plan: "free",
      updated_at: new Date().toISOString(),
    });
    if (error) {
      logger.error("[fetch-journal] ユーザー登録に失敗", { message: error.message });
      return defaultData;
    }
  }

  const plan: "free" | "deep" =
    (existing?.plan === "deep" || existing?.plan === "free"
      ? existing.plan
      : "free") as "free" | "deep";

  const [
    weekEntriesRes,
    deepStreakRes,
    todayEntryRes,
    dailyAnalysisRes,
    quotaRemaining,
  ] = await Promise.all([
    supabase
      .from("entries")
      .select("posted_at")
      .eq("user_id", userId)
      .gte("posted_at", weekFrom)
      .lt("posted_at", getNextDay(weekTo)),
    plan === "deep"
      ? supabase
          .from("entries")
          .select("posted_at")
          .eq("user_id", userId)
          .gte("posted_at", getLastNDaysRangeInTokyo(366).from)
          .lt("posted_at", getNextDay(getLastNDaysRangeInTokyo(366).to))
      : Promise.resolve({ data: null as { posted_at: string }[] | null }),
    supabase
      .from("entries")
      .select("id, body")
      .eq("user_id", userId)
      .gte("posted_at", today)
      .lt("posted_at", getNextDay(today))
      .limit(1)
      .maybeSingle(),
    supabase
      .from("analysis_results")
      .select("payload")
      .eq("user_id", userId)
      .eq("type", "daily")
      .gte("period_from", today)
      .lt("period_from", getNextDay(today))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getJournalRegenerationBRemaining(supabase, userId),
  ]);

  const [fy, fm, fd] = weekFrom.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const weekDates = new Set(
    (weekEntriesRes.data ?? []).map((r) =>
      toDateOnly((r as { posted_at: string }).posted_at),
    ),
  );
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
  if (plan === "deep" && Array.isArray(deepStreakRes.data) && deepStreakRes.data.length > 0) {
    streakDates = (deepStreakRes.data as { posted_at: string }[]).map((r) =>
      toDateOnly(r.posted_at),
    );
  } else {
    streakDates = Array.from(weekDates);
  }

  let todayEntry: TodayEntry | null = null;
  let analysis: JournalAnalysis | null = null;

  const todayRow = todayEntryRes.data;
  if (todayRow) {
    const plainBody = isEncryptionConfigured()
      ? decrypt((todayRow as { body: string }).body)
      : (todayRow as { body: string }).body;
    const { data: moodRow } = await supabase
      .from("moods")
      .select("value")
      .eq("entry_id", (todayRow as { id: string }).id)
      .limit(1)
      .maybeSingle();
    todayEntry = {
      id: (todayRow as { id: string }).id,
      body: plainBody ?? "",
      mood: moodRow?.value ?? null,
    };
    const analysisRow = dailyAnalysisRes.data;
    if (analysisRow?.payload) {
      analysis = normalizeAnalysis(
        (analysisRow as { payload: unknown }).payload,
      );
    }
  }

  const hasDailyAnalysis = Boolean(
    todayRow && dailyAnalysisRes.data?.payload,
  );

  return {
    weekDays,
    streakDates,
    todayEntry,
    analysis,
    plan,
    hasDailyAnalysis,
    journalRegenerationBRemaining: quotaRemaining,
    journalRegenerationBLimit: getJournalRegenerationBLimit(),
  };
}
