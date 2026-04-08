import { NextRequest, NextResponse } from "next/server";
import { generateJournalAnalysis, isGeminiRetryableError } from "@/lib/gemini";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  let inputTextLength = 0;
  try {
    const body = await req.json().catch(() => null) as {
      text?: string;
    } | null;

    const text = body?.text?.trim();
    inputTextLength = text?.length ?? 0;

    if (!text) {
      return NextResponse.json(
        { error: "invalid_request", message: "text is required" },
        { status: 400 },
      );
    }

    const analysis = await generateJournalAnalysis(text);

    return NextResponse.json(analysis, { status: 200 });
  } catch (error) {
    logger.errorException("[analyze/journal] ジャーナル分析でエラー", error, {
      inputTextLength,
    });

    if (isGeminiRetryableError(error)) {
      return NextResponse.json(
        {
          error: "upstream_unavailable",
          message:
            "分析に失敗しました。しばらく経ってから再度お試しください。",
        },
        { status: 503 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      { error: "analysis_failed", message },
      { status: 500 },
    );
  }
}
