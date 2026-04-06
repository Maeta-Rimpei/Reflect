import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import { FREE_PLAN_HISTORY_DAYS } from "@/constants/limits";
import { PLAN_DEEP, PLAN_FREE } from "@/constants/plan";
import type { Plan } from "@/types/plan";

/**
 * 指定期間の感情ログ（日付・気分・タグ）を返す。認証必須。Free プランは 7 日超で 403。
 * @param req - query: from, to (YYYY-MM-DD)
 * @returns 200 + EmotionRow[]、または 400/401/403/500
 */
export async function GET(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "unavailable", message: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authorization required" },
      { status: 401 },
    );
  }

  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (!fromParam || !toParam) {
    return NextResponse.json(
      { error: "validation", message: "from and to (YYYY-MM-DD) are required" },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseAdminClient();

    let plan: Plan = PLAN_FREE;
    const { data: profile } = await supabase
      .from("users")
      .select("plan")
      .eq("id", userId)
      .single();
    if (profile?.plan === PLAN_DEEP || profile?.plan === PLAN_FREE)
      plan = profile.plan;

    const fromDate = new Date(fromParam);
    const toDate = new Date(toParam);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: "validation", message: "Invalid from or to date" },
        { status: 400 },
      );
    }

    if (plan === PLAN_FREE) {
      const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      if (rangeDays > FREE_PLAN_HISTORY_DAYS) {
        return NextResponse.json(
          { error: "plan_limit", message: "Free plan: up to 7 days" },
          { status: 403 },
        );
      }
    }

    const { data: entriesInRange } = await supabase
      .from("entries")
      .select("id, posted_at")
      .eq("user_id", userId)
      .gte("posted_at", fromParam)
      .lte("posted_at", toParam);

    const entryIds = (entriesInRange ?? []).map((e) => e.id);
    if (entryIds.length === 0) {
      return NextResponse.json([]);
    }

    const { data: tags, error } = await supabase
      .from("emotion_tags")
      .select("entry_id, tag, created_at")
      .eq("user_id", userId)
      .in("entry_id", entryIds)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "db_error", message: error.message },
        { status: 500 },
      );
    }

    const entryByPost = new Map(
      (entriesInRange ?? []).map((e) => [e.id, e.posted_at]),
    );

    const moodsByEntry = await (async () => {
      const { data: moods } = await supabase
        .from("moods")
        .select("entry_id, value")
        .eq("user_id", userId)
        .in("entry_id", entryIds);
      const map = new Map<string, string>();
      for (const m of moods ?? []) {
        map.set(m.entry_id, m.value);
      }
      return map;
    })();

    // エントリーを起点にして、タグがなくても mood が表示されるようにする
    const byDate = new Map<
      string,
      { date: string; mood: string | null; tags: string[] }
    >();

    for (const entry of entriesInRange ?? []) {
      const postedAt = entry.posted_at;
      if (!byDate.has(postedAt)) {
        byDate.set(postedAt, {
          date: postedAt,
          mood: moodsByEntry.get(entry.id) ?? null,
          tags: [],
        });
      }
    }

    for (const t of tags ?? []) {
      const postedAt = entryByPost.get(t.entry_id);
      if (!postedAt) continue;
      const row = byDate.get(postedAt);
      if (row && !row.tags.includes(t.tag)) {
        row.tags.push(t.tag);
      }
    }

    const sorted = [...byDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, v]) => v);

    return NextResponse.json(sorted);
  } catch (e) {
    logger.errorException("[emotions GET] 感情一覧取得でエラー", e, {
      userId,
      from: fromParam,
      to: toParam,
    });
    return NextResponse.json(
      { error: "internal", message: "Failed to get emotions" },
      { status: 500 },
    );
  }
}
