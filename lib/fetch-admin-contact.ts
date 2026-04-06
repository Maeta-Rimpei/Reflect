import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

export type AdminContactRow = {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  category: string;
  body: string;
  created_at: string;
};

export type AdminContactListResult = {
  rows: AdminContactRow[];
  total: number;
  page: number;
  pageSize: number;
};

const DEFAULT_PAGE_SIZE = 25;

/**
 * 問い合わせ一覧（ユーザー email を別クエリで付与）。
 */
export async function fetchAdminContactList(params: {
  page?: number;
  pageSize?: number;
}): Promise<AdminContactListResult> {
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

    const { count: totalCount, error: countErr } = await supabase
      .from("contact_requests")
      .select("id", { count: "exact", head: true });

    if (countErr) {
      logger.error("[admin] 問い合わせ一覧の件数取得に失敗", {
        message: countErr.message,
      });
      return { rows: [], total: 0, page, pageSize };
    }

    const total = totalCount ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const from = (safePage - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("contact_requests")
      .select("id, user_id, category, body, created_at")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      logger.error("[admin] 問い合わせ一覧の取得に失敗", {
        message: error.message,
      });
      return { rows: [], total: 0, page, pageSize };
    }

    const requests = data ?? [];
    const userIds = [...new Set(requests.map((r) => r.user_id))];

    let emailMap = new Map<
      string,
      { email: string | null; name: string | null }
    >();
    if (userIds.length > 0) {
      const { data: users, error: uErr } = await supabase
        .from("users")
        .select("id, email, name")
        .in("id", userIds);

      if (uErr) {
        logger.error("[admin] 問い合わせ一覧のユーザー取得に失敗", {
          message: uErr.message,
        });
      } else {
        emailMap = new Map(
          (users ?? []).map((u) => [
            u.id,
            { email: u.email, name: u.name },
          ]),
        );
      }
    }

    const rows: AdminContactRow[] = requests.map((r) => {
      const u = emailMap.get(r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        user_email: u?.email ?? null,
        user_name: u?.name ?? null,
        category: r.category,
        body: r.body,
        created_at: r.created_at,
      };
    });

    return {
      rows,
      total,
      page: safePage,
      pageSize,
    };
  } catch (e) {
    logger.errorException("[admin] 問い合わせ一覧で例外", e);
    return { rows: [], total: 0, page, pageSize };
  }
}

export async function fetchAdminContactById(
  id: string,
): Promise<AdminContactRow | null> {
  if (!isSupabaseAdminConfigured() || !id) {
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("contact_requests")
      .select("id, user_id, category, body, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        logger.error("[admin] 問い合わせ詳細の取得に失敗", {
          message: error.message,
        });
      }
      return null;
    }

    const { data: user } = await supabase
      .from("users")
      .select("email, name")
      .eq("id", data.user_id)
      .maybeSingle();

    return {
      id: data.id,
      user_id: data.user_id,
      user_email: user?.email ?? null,
      user_name: user?.name ?? null,
      category: data.category,
      body: data.body,
      created_at: data.created_at,
    };
  } catch (e) {
    logger.errorException("[admin] 問い合わせ詳細で例外", e);
    return null;
  }
}
