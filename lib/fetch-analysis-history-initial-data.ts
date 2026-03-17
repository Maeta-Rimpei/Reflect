/**
 * レポート履歴ページの初回表示用データをサーバー側で取得する。
 * Supabase を直接利用し、自 API への HTTP 呼び出しを行わない。
 */
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import type {
  AnalysisHistoryInitialData,
  AnalysisHistoryMiscItem,
  AnalysisReportItem,
} from "@/types/analysis";

/**
 * 週次・月次・年次・人格サマリー・問いかけのレポート一覧を取得する。
 * @param userId - 認証済みユーザー ID
 */
export async function fetchAnalysisHistoryInitialData(
  userId: string,
): Promise<AnalysisHistoryInitialData> {
  const empty: AnalysisHistoryInitialData = {
    lists: { weekly: [], monthly: [], yearly: [], personality: [], question: [] },
  };

  if (!isSupabaseAdminConfigured()) {
    return empty;
  }

  const supabase = createSupabaseAdminClient();

  const [wRes, mRes, yRes, pRes, qRes] = await Promise.all([
    // 週次
    supabase
      .from("analysis_results")
      .select("id, type, period_from, period_to, payload, created_at")
      .eq("user_id", userId)
      .eq("type", "weekly")
      .order("created_at", { ascending: false }),
    // 月次
    supabase
      .from("analysis_results")
      .select("id, type, period_from, period_to, payload, created_at")
      .eq("user_id", userId)
      .eq("type", "monthly")
      .order("created_at", { ascending: false }),
    // 年次
    supabase
      .from("analysis_results")
      .select("id, type, period_from, period_to, payload, created_at")
      .eq("user_id", userId)
      .eq("type", "yearly")
      .order("created_at", { ascending: false }),
    // 人格サマリ
    supabase
      .from("analysis_results")
      .select("id, type, payload, created_at")
      .eq("user_id", userId)
      .eq("type", "personality")
      .order("created_at", { ascending: false }),
    // 問いかけ
    supabase
      .from("analysis_results")
      .select("id, type, payload, created_at")
      .eq("user_id", userId)
      .eq("type", "question")
      .order("created_at", { ascending: false }),
  ]);

  const toReportItems = (
    rows: { id: string; type: string; period_from: string; period_to: string; payload: unknown; created_at: string }[] | null,
  ): AnalysisReportItem[] =>
    (rows ?? []).map((r) => ({
      id: r.id,
      type: r.type,
      period: { from: r.period_from, to: r.period_to },
      payload: r.payload as AnalysisReportItem["payload"],
      createdAt: r.created_at,
    }));

  const toMiscItems = (
    rows: { id: string; type: string; payload: unknown; created_at: string }[] | null,
  ): AnalysisHistoryMiscItem[] =>
    (rows ?? []).map((r) => ({
      id: r.id,
      type: r.type,
      payload: r.payload as AnalysisHistoryMiscItem["payload"],
      createdAt: r.created_at,
    }));

  return {
    lists: {
      weekly: toReportItems(wRes.data),
      monthly: toReportItems(mRes.data),
      yearly: toReportItems(yRes.data),
      personality: toMiscItems(pRes.data),
      question: toMiscItems(qRes.data),
    },
  };
}
