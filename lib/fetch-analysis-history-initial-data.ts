/**
 * レポート履歴ページの初回表示用データをサーバー側で取得する。
 * 週次・月次・年次の分析一覧を並列で取得する。
 */
import type {
  AnalysisHistoryInitialData,
  AnalysisReportItem,
} from "@/types/analysis";

/**
 * 週次・月次・年次レポート一覧を取得する。
 * @param baseUrl - アプリのオリジン
 * @param cookieHeader - リクエストの Cookie ヘッダー
 */
export async function fetchAnalysisHistoryInitialData(
  baseUrl: string,
  cookieHeader: string,
): Promise<AnalysisHistoryInitialData> {
  const headers = { Cookie: cookieHeader };

  const [wRes, mRes, yRes] = await Promise.all([
    fetch(`${baseUrl}/api/v1/analysis?type=weekly`, { headers, cache: "no-store" }),
    fetch(`${baseUrl}/api/v1/analysis?type=monthly`, { headers, cache: "no-store" }),
    fetch(`${baseUrl}/api/v1/analysis?type=yearly`, { headers, cache: "no-store" }),
  ]);

  const weeklyList = wRes.ok ? ((await wRes.json()) as AnalysisReportItem[]) : [];
  const monthlyList = mRes.ok ? ((await mRes.json()) as AnalysisReportItem[]) : [];
  const yearlyList = yRes.ok ? ((await yRes.json()) as AnalysisReportItem[]) : [];

  return {
    lists: {
      weekly: Array.isArray(weeklyList) ? weeklyList : [],
      monthly: Array.isArray(monthlyList) ? monthlyList : [],
      yearly: Array.isArray(yearlyList) ? yearlyList : [],
    },
  };
}
