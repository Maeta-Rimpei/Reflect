import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchHistoryRangeData } from "@/lib/fetch-history-initial-data";
import { logger } from "@/lib/logger";

/**
 * 指定範囲の履歴データを1回のリクエストで返す。認証必須。
 * クライアントの月切り替え時に利用し、entries・calendar・emotions の3本立て fetch をサーバー側に集約する。
 * @param req - query: from, to (YYYY-MM-DD), viewMonth (0-11), viewYear
 * @returns 200 + HistoryInitialData 相当の JSON、または 400/401/500
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "ログインしてください。" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const viewMonthParam = searchParams.get("viewMonth");
  const viewYearParam = searchParams.get("viewYear");

  if (!fromParam || !toParam || viewMonthParam == null || viewYearParam == null) {
    return NextResponse.json(
      { error: "validation", message: "from, to, viewMonth, viewYear を指定してください。" },
      { status: 400 },
    );
  }

  const viewMonth = parseInt(viewMonthParam, 10);
  const viewYear = parseInt(viewYearParam, 10);
  if (
    Number.isNaN(viewMonth) ||
    Number.isNaN(viewYear) ||
    viewMonth < 0 ||
    viewMonth > 11
  ) {
    return NextResponse.json(
      { error: "validation", message: "viewMonth は 0-11、viewYear は数値で指定してください。" },
      { status: 400 },
    );
  }

  try {
    const userId = session.user.id;
    const data = await fetchHistoryRangeData(userId, {
      from: fromParam,
      to: toParam,
      viewMonth,
      viewYear,
    });

    return NextResponse.json(data);
  } catch (e) {
    logger.errorException("[history GET]", e);
    return NextResponse.json(
      { error: "internal", message: "履歴の取得に失敗しました。" },
      { status: 500 },
    );
  }
}
