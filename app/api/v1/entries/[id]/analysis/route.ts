import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import type {
  DailyAnalysisPayloadFromDb,
  DailyAnalysisResponse,
} from "@/types/gemini";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "validation", message: "id is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseAdminClient();

    const { data: entry, error: entryError } = await supabase
      .from("entries")
      .select("id, posted_at")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (entryError || !entry) {
      return NextResponse.json(
        { error: "not_found", message: "Entry not found" },
        { status: 404 },
      );
    }

    const { data: analysis, error: analysisError } = await supabase
      .from("analysis_results")
      .select("payload")
      .eq("user_id", userId)
      .eq("type", "daily")
      .eq("period_from", entry.posted_at)
      .eq("period_to", entry.posted_at)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (analysisError || !analysis?.payload) {
      return NextResponse.json(
        { error: "not_found", message: "Journal analysis not found for this entry" },
        { status: 404 },
      );
    }

    const p = analysis.payload as DailyAnalysisPayloadFromDb;

    const body: DailyAnalysisResponse = {
      summary: p.summary ?? "",
      primaryEmotion: p.primaryEmotion ?? "",
      secondaryEmotion: p.secondaryEmotion ?? "",
      thoughtPatterns: p.thoughtPatterns ?? [],
      tension: p.tension ?? "",
      metaInsight: p.metaInsight ?? "",
      question: p.question ?? "",
    };

    return NextResponse.json(body);
  } catch (e) {
    logger.errorException("[entries GET analysis] エントリー分析取得でエラー", e, {
      userId,
      entryId: id,
    });
    return NextResponse.json(
      { error: "internal", message: "Failed to get analysis" },
      { status: 500 },
    );
  }
}
