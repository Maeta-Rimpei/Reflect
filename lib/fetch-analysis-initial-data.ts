/**
 * 分析ページの初回表示用データをサーバー側で取得する。
 * Supabase を直接利用し、自 API への HTTP 呼び出しを行わない。
 */
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import {
  getWeekRangeInTokyo,
  getMonthRangeInTokyo,
  getLast12MonthsRangeInTokyo,
  getNextDay,
} from "@/lib/date-utils";
import type {
  AnalysisInitialData,
  PersonalityData,
  WeeklyPayload,
  MonthlyPayload,
  YearlyPayload,
} from "@/types/analysis";

/** plan を除いた分析初期データ（plan はページで getPlan() と結合する） */
export type AnalysisInitialDataWithoutPlan = Omit<
  AnalysisInitialData,
  "plan"
>;

/**
 * 分析ページ用の初期データを取得する。Supabase を直接参照する。
 * @param userId - 認証済みユーザー ID（呼び出し元で auth() 取得済みであること）
 */
export async function fetchAnalysisInitialData(
  userId: string,
): Promise<AnalysisInitialDataWithoutPlan> {
  if (!isSupabaseAdminConfigured()) {
    return {
      weeklyReport: null,
      monthlyReport: null,
      yearlyReport: null,
      personalitySummary: null,
      questions: [],
    };
  }

  const { from: wFrom, to: wTo } = getWeekRangeInTokyo();
  const { from: mFrom, to: mTo } = getMonthRangeInTokyo();
  const { from: yFrom, to: yTo } = getLast12MonthsRangeInTokyo();

  const supabase = createSupabaseAdminClient();

  const [weeklyRes, monthlyRes, yearlyRes, personalityRes, questionRes] =
    await Promise.all([
      supabase
        .from("analysis_results")
        .select("id, period_from, period_to, payload, created_at")
        .eq("user_id", userId)
        .eq("type", "weekly")
        .gte("period_from", wFrom)
        .lt("period_to", getNextDay(wTo))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("analysis_results")
        .select("id, period_from, period_to, payload, created_at")
        .eq("user_id", userId)
        .eq("type", "monthly")
        .gte("period_from", mFrom)
        .lt("period_to", getNextDay(mTo))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("analysis_results")
        .select("id, period_from, period_to, payload, created_at")
        .eq("user_id", userId)
        .eq("type", "yearly")
        .gte("period_from", yFrom)
        .lt("period_to", getNextDay(yTo))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("analysis_results")
        .select("payload, created_at")
        .eq("user_id", userId)
        .eq("type", "personality")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("analysis_results")
        .select("payload")
        .eq("user_id", userId)
        .eq("type", "question")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const weeklyReport =
    weeklyRes.data != null
      ? {
          period: {
            from: weeklyRes.data.period_from,
            to: weeklyRes.data.period_to,
          },
          payload: weeklyRes.data.payload as WeeklyPayload,
        }
      : null;

  const monthlyReport =
    monthlyRes.data != null
      ? {
          period: {
            from: monthlyRes.data.period_from,
            to: monthlyRes.data.period_to,
          },
          payload: monthlyRes.data.payload as MonthlyPayload,
        }
      : null;

  const yearlyReport =
    yearlyRes.data != null
      ? {
          period: {
            from: yearlyRes.data.period_from,
            to: yearlyRes.data.period_to,
          },
          payload: yearlyRes.data.payload as YearlyPayload,
        }
      : null;

  let personalitySummary: PersonalityData | null = null;
  if (personalityRes.data?.payload != null) {
    const p = personalityRes.data.payload as {
      tendency?: string;
      strengthSignals?: string[];
      riskPatterns?: string[];
      downTriggers?: string;
      recoveryActions?: string;
    };
    personalitySummary = {
      tendency: p.tendency ?? "",
      strengthSignals: p.strengthSignals ?? [],
      riskPatterns: p.riskPatterns ?? [],
      downTriggers: p.downTriggers ?? "",
      recoveryActions: p.recoveryActions ?? "",
      updatedAt: personalityRes.data.created_at,
    };
  }

  let questions: string[] = [];
  if (questionRes.data?.payload != null) {
    const q = questionRes.data.payload as { questions?: string[] };
    questions = Array.isArray(q.questions) ? q.questions : [];
  }

  return {
    weeklyReport,
    monthlyReport,
    yearlyReport,
    personalitySummary,
    questions,
  };
}
