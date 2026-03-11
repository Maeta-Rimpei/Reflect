/**
 * 分析ページの初回表示用データをサーバー側で取得する。
 * Server Component から呼び、Cookie 付きで API に問い合わせる。
 */
import {
  getWeekRangeInTokyo,
  getMonthRangeInTokyo,
  getLast12MonthsRangeInTokyo,
} from "@/lib/date-utils";
import type {
  AnalysisInitialData,
  PersonalityData,
  WeeklyPayload,
  MonthlyPayload,
  YearlyPayload,
} from "@/types/analysis";

/**
 * 分析ページ用の初期データを取得する。認証は API 側で Cookie を検証する。
 * @param baseUrl - アプリのオリジン（例: process.env.NEXTAUTH_URL）
 * @param cookieHeader - リクエストの Cookie ヘッダー（そのまま API に渡す）
 */
export async function fetchAnalysisInitialData(
  baseUrl: string,
  cookieHeader: string,
): Promise<AnalysisInitialData> {
  const { from: wFrom, to: wTo } = getWeekRangeInTokyo();
  const { from: mFrom, to: mTo } = getMonthRangeInTokyo();
  const { from: yFrom, to: yTo } = getLast12MonthsRangeInTokyo();

  const headers = { Cookie: cookieHeader };

  const [meRes, weeklyRes, monthlyRes, yearlyRes, summaryRes, questionRes] =
    await Promise.all([
      fetch(`${baseUrl}/api/v1/me`, { headers, cache: "no-store" }),
      fetch(
        `${baseUrl}/api/v1/analysis?type=weekly&from=${wFrom}&to=${wTo}`,
        { headers, cache: "no-store" },
      ),
      fetch(
        `${baseUrl}/api/v1/analysis?type=monthly&from=${mFrom}&to=${mTo}`,
        { headers, cache: "no-store" },
      ),
      fetch(
        `${baseUrl}/api/v1/analysis?type=yearly&from=${yFrom}&to=${yTo}`,
        { headers, cache: "no-store" },
      ),
      fetch(`${baseUrl}/api/v1/analysis/summary`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${baseUrl}/api/v1/analysis?type=question`, {
        headers,
        cache: "no-store",
      }),
    ]);

  const plan: "free" | "deep" = meRes.ok
    ? ((await meRes.json()) as { plan?: "free" | "deep" }).plan ?? "free"
    : "free";

  const weeklyList = weeklyRes.ok
    ? (await weeklyRes.json()) as Array<{
        period: { from: string; to: string };
        payload: WeeklyPayload;
      }>
    : [];
  const monthlyList = monthlyRes.ok
    ? (await monthlyRes.json()) as Array<{
        period: { from: string; to: string };
        payload: MonthlyPayload;
      }>
    : [];
  const yearlyList = yearlyRes.ok
    ? (await yearlyRes.json()) as Array<{
        period: { from: string; to: string };
        payload: YearlyPayload;
      }>
    : [];

  const personalitySummary: PersonalityData | null = summaryRes.ok
    ? (await summaryRes.json()) as PersonalityData
    : null;

  let questions: string[] = [];
  if (questionRes.ok) {
    const list = (await questionRes.json()) as Array<{
      payload: { questions?: string[] };
    }>;
    const latest = list?.[0]?.payload?.questions;
    questions = Array.isArray(latest) ? latest : [];
  }

  return {
    plan,
    weeklyReport: weeklyList?.length > 0 ? weeklyList[0] : null,
    monthlyReport: monthlyList?.length > 0 ? monthlyList[0] : null,
    yearlyReport: yearlyList?.length > 0 ? yearlyList[0] : null,
    personalitySummary,
    questions,
  };
}
