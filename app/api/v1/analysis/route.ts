import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

/**
 * 分析結果一覧を取得する。認証必須。
 * @param req - query: type (daily|weekly|monthly|yearly|personality|question), from, to (任意)
 * @returns 200 + { id, type, period, payload, createdAt }[]、または 400/401/500
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
  const typeParam = searchParams.get("type");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const allowedTypes = ["daily", "weekly", "monthly", "yearly", "personality", "question"];
  if (!typeParam || !allowedTypes.includes(typeParam)) {
    return NextResponse.json(
      { error: "validation", message: "type must be one of: " + allowedTypes.join(", ") },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseAdminClient();

    let query = supabase
      .from("analysis_results")
      .select("id, type, period_from, period_to, payload, created_at")
      .eq("user_id", userId)
      .eq("type", typeParam)
      .order("created_at", { ascending: false });

    if (fromParam && toParam) {
      query = query.gte("period_from", fromParam).lte("period_to", toParam);
    }

    const { data: rows, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "db_error", message: error.message },
        { status: 500 },
      );
    }

    const list = (rows ?? []).map((r) => ({
      id: r.id,
      type: r.type,
      period: { from: r.period_from, to: r.period_to },
      payload: r.payload,
      createdAt: r.created_at,
    }));

    return NextResponse.json(list);
  } catch (e) {
    logger.errorException("[analysis GET] 分析一覧取得でエラー", e, {
      userId,
      type: typeParam,
      from: fromParam,
      to: toParam,
    });
    return NextResponse.json(
      { error: "internal", message: "Failed to list analysis" },
      { status: 500 },
    );
  }
}
