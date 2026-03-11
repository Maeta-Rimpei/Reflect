import { NextRequest, NextResponse } from "next/server";
import { generateJournalAnalysis } from "@/lib/gemini";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as {
      text?: string;
    } | null;

    const text = body?.text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "invalid_request", message: "text is required" },
        { status: 400 },
      );
    }

    const analysis = await generateJournalAnalysis(text);

    return NextResponse.json(analysis, { status: 200 });
  } catch (error) {
    logger.errorException("[analyze/journal] ジャーナル分析でエラー", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      { error: "analysis_failed", message },
      { status: 500 },
    );
  }
}
