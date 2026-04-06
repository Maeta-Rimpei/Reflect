import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

export type AdminUserRow = {
  id: string;
  email: string | null;
  name: string | null;
  plan: string;
  email_verified: boolean;
  created_at: string;
  deleted_at: string | null;
};

export type AdminUsersListResult = {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
};

const DEFAULT_PAGE_SIZE = 20;

/** ILIKE 用に % _ を除去（ワイルドカード注入防止） */
function safeIlikeFragment(raw: string): string {
  return raw.trim().replace(/[%_]/g, "");
}

function buildSearchOr(q: string): string | null {
  const t = q.trim();
  if (!t) return null;
  const like = safeIlikeFragment(t);
  if (!like) return null;
  // id はそのまま等価（カンマ等は PostgREST の or 構文を壊すので ilike のみ）
  if (/[,)"]/.test(t)) {
    return `email.ilike.%${like}%`;
  }
  return `id.eq.${t},email.ilike.%${like}%`;
}

/**
 * ユーザー一覧（検索・ページング）。メタのみ。
 */
export async function fetchAdminUsersList(params: {
  q?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<AdminUsersListResult> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Math.floor(params.pageSize ?? DEFAULT_PAGE_SIZE)),
  );

  if (!isSupabaseAdminConfigured()) {
    return { rows: [], total: 0, page, pageSize };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const orFilter = params.q ? buildSearchOr(params.q) : null;

    let countQuery = supabase
      .from("users")
      .select("id", { count: "exact", head: true });
    if (orFilter) {
      countQuery = countQuery.or(orFilter);
    }
    const { count: totalCount, error: countErr } = await countQuery;
    if (countErr) {
      logger.error("[admin] ユーザー一覧の件数取得に失敗", {
        message: countErr.message,
      });
      return { rows: [], total: 0, page, pageSize };
    }

    const total = totalCount ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);

    let query = supabase
      .from("users")
      .select(
        "id, email, name, plan, email_verified, created_at, deleted_at",
      )
      .order("created_at", { ascending: false });

    if (orFilter) {
      query = query.or(orFilter);
    }

    const from = (safePage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await query.range(from, to);

    if (error) {
      logger.error("[admin] ユーザー一覧の取得に失敗", { message: error.message });
      return { rows: [], total: 0, page, pageSize };
    }

    return {
      rows: (data ?? []) as AdminUserRow[],
      total,
      page: safePage,
      pageSize,
    };
  } catch (e) {
    logger.errorException("[admin] ユーザー一覧で例外", e);
    return { rows: [], total: 0, page, pageSize };
  }
}

export type AdminUserDetail = {
  user: AdminUserRow | null;
  subscription: {
    status: string | null;
    current_period_end: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  counts: {
    entries: number;
    analysisResults: number;
  };
};

/**
 * ユーザー詳細 + subscriptions メタ + 件数（本文は取得しない）。
 */
export async function fetchAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail> {
  const empty: AdminUserDetail = {
    user: null,
    subscription: null,
    counts: { entries: 0, analysisResults: 0 },
  };

  if (!isSupabaseAdminConfigured() || !userId) {
    return empty;
  }

  try {
    const supabase = createSupabaseAdminClient();

    const [userRes, subRes, entriesRes, analysisRes] = await Promise.all([
      supabase
        .from("users")
        .select(
          "id, email, name, plan, email_verified, created_at, deleted_at",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select(
          "status, current_period_end, stripe_customer_id, stripe_subscription_id, created_at, updated_at",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("analysis_results")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    if (userRes.error) {
      logger.error("[admin] ユーザー詳細の取得に失敗", {
        message: userRes.error.message,
      });
      return empty;
    }

    if (!userRes.data) {
      return empty;
    }

    return {
      user: userRes.data as AdminUserRow,
      subscription: subRes.data
        ? {
            status: subRes.data.status,
            current_period_end: subRes.data.current_period_end,
            stripe_customer_id: subRes.data.stripe_customer_id,
            stripe_subscription_id: subRes.data.stripe_subscription_id,
            created_at: subRes.data.created_at,
            updated_at: subRes.data.updated_at,
          }
        : null,
      counts: {
        entries: entriesRes.count ?? 0,
        analysisResults: analysisRes.count ?? 0,
      },
    };
  } catch (e) {
    logger.errorException("[admin] ユーザー詳細で例外", e);
    return empty;
  }
}
