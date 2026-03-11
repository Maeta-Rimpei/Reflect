import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

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

  try {
    const supabase = createSupabaseAdminClient();

    const { data: row, error } = await supabase
      .from("analysis_results")
      .select("payload, created_at")
      .eq("user_id", userId)
      .eq("type", "personality")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "db_error", message: error.message },
        { status: 500 },
      );
    }

    if (!row?.payload) {
      return NextResponse.json(
        { error: "not_found", message: "No personality summary yet" },
        { status: 404 },
      );
    }

    const p = row.payload as {
      tendency?: string;
      strengthSignals?: string[];
      riskPatterns?: string[];
      downTriggers?: string;
      recoveryActions?: string;
    };

    return NextResponse.json({
      tendency: p.tendency ?? "",
      strengthSignals: p.strengthSignals ?? [],
      riskPatterns: p.riskPatterns ?? [],
      downTriggers: p.downTriggers ?? "",
      recoveryActions: p.recoveryActions ?? "",
      updatedAt: row.created_at,
    });
  } catch (e) {
    logger.errorException("[analysis/summary GET] サマリー取得でエラー", e);
    return NextResponse.json(
      { error: "internal", message: "Failed to get summary" },
      { status: 500 },
    );
  }
}
