import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { PLAN_DEEP } from "@/constants/plan";
import { logger } from "@/lib/logger";

export type AdminDashboardStats = {
  /** 登録ユーザー総数（論理削除除く） */
  totalActiveUsers: number;
  /** 直近 7 日（UTC 基準ではなく DB の created_at をそのまま比較: アプリは東京運用だが集計はシンプルに） */
  newUsersLast7Days: number;
  /** plan = deep かつ論理削除でないユーザー数 */
  deepPlanUsers: number;
  /** 問い合わせ総数 */
  contactRequestsTotal: number;
  /** 直近 7 日の問い合わせ件数 */
  contactRequestsLast7Days: number;
};

const EMPTY: AdminDashboardStats = {
  totalActiveUsers: 0,
  newUsersLast7Days: 0,
  deepPlanUsers: 0,
  contactRequestsTotal: 0,
  contactRequestsLast7Days: 0,
};

/**
 * 管理ダッシュボード用 KPI。Supabase 未設定時はゼロ埋め。
 */
export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  if (!isSupabaseAdminConfigured()) {
    return EMPTY;
  }

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  try {
    const supabase = createSupabaseAdminClient();

    const [
      activeRes,
      newRes,
      deepRes,
      contactTotalRes,
      contactRes,
    ] = await Promise.all([
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .gte("created_at", sinceIso),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("plan", PLAN_DEEP),
      supabase
        .from("contact_requests")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("contact_requests")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sinceIso),
    ]);

    const err =
      activeRes.error ||
      newRes.error ||
      deepRes.error ||
      contactTotalRes.error ||
      contactRes.error;
    if (err) {
      logger.error("[admin] ダッシュボード集計に失敗", { message: err.message });
      return EMPTY;
    }

    return {
      totalActiveUsers: activeRes.count ?? 0,
      newUsersLast7Days: newRes.count ?? 0,
      deepPlanUsers: deepRes.count ?? 0,
      contactRequestsTotal: contactTotalRes.count ?? 0,
      contactRequestsLast7Days: contactRes.count ?? 0,
    };
  } catch (e) {
    logger.errorException("[admin] ダッシュボード集計で例外", e);
    return EMPTY;
  }
}
