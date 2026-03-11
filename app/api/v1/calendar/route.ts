import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

/**
 * 指定期間内にエントリがある日付のリストを返す。認証必須。Free プランは 7 日超で 403。
 * @param req - query: from, to (YYYY-MM-DD)
 * @returns 200 + { dates: string[] }（YYYY-MM-DD の配列）、または 400/401/403/500
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

    let plan: "free" | "deep" = "free";
    const { data: profile } = await supabase
      .from("users")
      .select("plan")
      .eq("id", userId)
      .single();
    if (profile?.plan === "deep" || profile?.plan === "free") plan = profile.plan;

    const fromDate = new Date(fromParam);
    const toDate = new Date(toParam);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return NextResponse.json(
        { error: "validation", message: "Invalid from or to date" },
        { status: 400 },
      );
    }

    if (plan === "free") {
      const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      if (rangeDays > 7) {
        return NextResponse.json(
          { error: "plan_limit", message: "Free plan: up to 7 days of history" },
          { status: 403 },
        );
      }
    }

    const { data: rows, error } = await supabase
      .from("entries")
      .select("posted_at")
      .eq("user_id", userId)
      .gte("posted_at", fromParam)
      .lte("posted_at", toParam);

    if (error) {
      return NextResponse.json(
        { error: "db_error", message: error.message },
        { status: 500 },
      );
    }

    const toYYYYMMDD = (v: unknown): string => {
      if (v == null || v === "") return "";
      const s = String(v);
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const d = new Date(v as string | number | Date);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
    };
    const rawDates = (rows ?? []).map((r) => toYYYYMMDD((r as { posted_at: unknown }).posted_at));
    const dates = [...new Set(rawDates.filter(Boolean))];
    return NextResponse.json({ dates });
  } catch (e) {
    logger.errorException("[calendar GET] カレンダー取得でエラー", e);
    return NextResponse.json(
      { error: "internal", message: "Failed to get calendar" },
      { status: 500 },
    );
  }
}
