import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import {
  generateJournalAnalysis,
  generateWeeklyAnalysis,
  generateMonthlyAnalysis,
  generatePersonalitySummary,
  generateQuestions,
  generateYearlyAnalysis,
} from "@/lib/gemini";
import { decrypt, isEncryptionConfigured } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { getLast12MonthsRangeInTokyo } from "@/lib/date-utils";
import { truncateCommentForSummary } from "@/lib/string-utils";
import { PROMPT_VERSIONS } from "@/lib/prompt-versions";

const DEEP_TYPES = ["weekly", "monthly", "yearly", "personality", "question"] as const;
const ALL_TYPES = ["daily", ...DEEP_TYPES] as const;

/** 年次入力: 1レポートあたりの summary 最大文字数 */
const YEARLY_SUMMARY_MAX = 300;
/** 年次入力: 合計最大文字数（トークン抑制） */
const YEARLY_INPUT_MAX = 4000;

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "unavailable", message: "Supabase が設定されていません。" },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "ログインしてください。" },
      { status: 401 },
    );
  }

  const userId = session.user.id;

  try {
  // throw new Error("test");

    const body = (await req.json().catch(() => null)) as {
      type?: string;
      from?: string;
      to?: string;
    } | null;

    const type = body?.type;
    if (!type || !ALL_TYPES.includes(type as (typeof ALL_TYPES)[number])) {
      return NextResponse.json(
        {
          error: "validation",
          message:
            "type は daily, weekly, monthly, yearly, personality, question のいずれかを指定してください。",
        },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    // ── デイリー分析リトライ（全プラン利用可） ──
    if (type === "daily") {
      return await retryJournalAnalysis(supabase, userId);
    }

    const { data: profile } = await supabase
      .from("users")
      .select("plan")
      .eq("id", userId)
      .single();
      
    const plan = profile?.plan === "deep" ? "deep" : "free";

    if (plan !== "deep") {
      return NextResponse.json(
        {
          error: "plan_limit",
          message: "この機能はDeepプランが必要です。",
        },
        { status: 403 },
      );
    }

// -------- Deepプランの場合のみ実行 --------
    // ── 月次レポート ──
    if (type === "monthly") {
      const fromParam = body?.from ?? "";
      const toParam = body?.to ?? "";
      if (!fromParam || !toParam) {
        return NextResponse.json(
          {
            error: "validation",
            message: "生成期間が未指定です。",
          },
          { status: 400 },
        );
      }

      // 同月に既に生成済みかチェック
      const { data: existingMonthly } = await supabase
        .from("analysis_results")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "monthly")
        .eq("period_from", fromParam)
        .eq("period_to", toParam)
        .limit(1);

      if (existingMonthly && existingMonthly.length > 0) {
        return NextResponse.json(
          {
            error: "rate_limit",
            message: "この月のレポートは既に生成済みです。",
          },
          { status: 429 },
        );
      }

      return await generateMonthlyReport(
        supabase,
        userId,
        fromParam,
        toParam,
      );
    }

    // ── 週次レポート ──
    if (type === "weekly") {
      const fromParam = body?.from ?? "";
      const toParam = body?.to ?? "";
      if (!fromParam || !toParam) {
        return NextResponse.json(
          {
            error: "validation",
            message: "from と to（YYYY-MM-DD）は必須です。",
          },
          { status: 400 },
        );
      }

      return await generateWeeklyReport(
        supabase,
        userId,
        fromParam,
        toParam,
      );
    }

    // ── 人格サマリー（前回から1か月経過しないと再生成不可） ──
    if (type === "personality") {
      const cooldownError = await checkCooldown(
        supabase,
        userId,
        "personality",
        30,
        "人格サマリーは前回の生成から1か月経過しないと再生成できません。",
      );
      if (cooldownError) return cooldownError;

      // 入力テキスト: 年次レポートがあればそれを、なければ週次・月次から組み立てる
      let inputText = "";

      const { data: existingYearlyResults } = await supabase
        .from("analysis_results")
        .select("payload")
        .eq("user_id", userId)
        .eq("type", "yearly")
        .order("created_at", { ascending: false })
        .limit(10);

      if (existingYearlyResults && existingYearlyResults.length > 0) {
        inputText = (existingYearlyResults ?? [])
          .map((r) => {
            const p = r.payload as {
              coreThoughtPatterns?: string[];
              emotionTrend?: string;
              stressSourcesRanking?: string[];
              motivationDrivers?: string[];
              identityTraits?: string[];
            };
            return [
              (p.coreThoughtPatterns ?? []).join("、"),
              p.emotionTrend,
              (p.stressSourcesRanking ?? []).join("、"),
              (p.motivationDrivers ?? []).join("、"),
              (p.identityTraits ?? []).join("、"),
            ]
              .filter(Boolean)
              .join(" ");
          })
          .join("\n\n");
      }

      // 年次が無い or 空 → 週次・月次でフォールバック
      if (!inputText.trim()) {
        const { from: fallbackFrom, to: fallbackTo } =
          getLast12MonthsRangeInTokyo();
        const monthlyRows = await supabase
          .from("analysis_results")
          .select("period_from, period_to, payload, created_at")
          .eq("user_id", userId)
          .eq("type", "monthly")
          .lte("period_from", fallbackTo)
          .gte("period_to", fallbackFrom)
          .order("period_from", { ascending: true });

        const weeklyRows = await supabase
          .from("analysis_results")
          .select("period_from, period_to, payload, created_at")
          .eq("user_id", userId)
          .eq("type", "weekly")
          .lte("period_from", fallbackTo)
          .gte("period_to", fallbackFrom)
          .order("period_from", { ascending: true });

        type Row = {
          period_from: string;
          period_to: string;
          payload: unknown;
          created_at: string;
        };
        const monthly = (monthlyRows.data ?? []) as Row[];
        const weekly = (weeklyRows.data ?? []) as Row[];
        const allRows = [
          ...monthly.map((r) => ({ ...r, kind: "monthly" as const })),
          ...weekly.map((r) => ({ ...r, kind: "weekly" as const })),
        ].sort(
          (a, b) =>
            a.period_from.localeCompare(b.period_from) ||
            a.created_at.localeCompare(b.created_at),
        );

        const lines: string[] = [];
        let totalLen = 0;
        for (const row of allRows) {
          if (totalLen >= YEARLY_INPUT_MAX) break;
          const p = (row.payload ?? {}) as Record<string, unknown>;
          let insight = "";
          let patterns = "";
          if (row.kind === "weekly") {
            insight = String(p.weeklyInsight ?? "").slice(0, YEARLY_SUMMARY_MAX);
            patterns = (Array.isArray(p.thoughtPatterns)
              ? p.thoughtPatterns
              : []
            ).slice(0, 5).join("、");
          } else {
            insight = String(p.monthlyInsight ?? "").slice(
              0,
              YEARLY_SUMMARY_MAX,
            );
            patterns = (Array.isArray(p.recurringThoughtPatterns)
              ? p.recurringThoughtPatterns
              : []
            ).slice(0, 5).join("、");
          }
          const line = `[${row.period_from}〜${row.period_to}] ${row.kind === "monthly" ? "月次" : "週次"}: ${insight}${patterns ? ` パターン: ${patterns}` : ""}`;
          lines.push(line);
          totalLen += line.length + 1;
        }
        inputText = lines.join("\n").slice(0, YEARLY_INPUT_MAX);
      }

      if (!inputText.trim()) {
        return NextResponse.json(
          {
            error: "validation",
            message:
              "人格サマリーの生成には、年次・週次・月次のいずれかのレポートが必要です。先に週次または月次レポートを生成してください。",
          },
          { status: 400 },
        );
      }

      const personality = await generatePersonalitySummary(inputText);

      const { data: inserted, error: insertErr } = await supabase
        .from("analysis_results")
        .insert({
          user_id: userId,
          type: "personality",
          period_from: null,
          period_to: null,
          prompt_version: PROMPT_VERSIONS.personality,
          payload: personality,
        })
        .select("id, created_at")
        .single();

      if (insertErr) {
        return NextResponse.json(
          { error: "db_error", message: "データの保存に失敗しました。" },
          { status: 500 },
        );
      }

      const qs = await generateQuestions(
        personality.tendency + "\n" + personality.downTriggers,
      );

      if (qs.length > 0) {
        await supabase.from("analysis_results").insert({
          user_id: userId,
          type: "question",
          period_from: null,
          period_to: null,
          prompt_version: PROMPT_VERSIONS.question,
          payload: { questions: qs },
        });
      }

      return NextResponse.json({
        id: inserted.id,
        type: "personality",
        payload: personality,
        questions: qs,
        createdAt: inserted.created_at,
      });
    }

    // ── 問いかけ単体（週1回制限） ──
    if (type === "question") {
      const cooldownError = await checkCooldown(
        supabase,
        userId,
        "question",
        7,
        "問いかけは週に1回のみ生成できます。",
      );
      if (cooldownError) return cooldownError;

      // 最新の人格サマリーを取得
      const { data: latestPersonality } = await supabase
        .from("analysis_results")
        .select("payload")
        .eq("user_id", userId)
        .eq("type", "personality")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!latestPersonality) {
        return NextResponse.json(
          {
            error: "validation",
            message:
              "問いかけの生成には人格サマリーが必要です。先に人格サマリーを生成してください。",
          },
          { status: 400 },
        );
      }

      const p = latestPersonality.payload as {
        tendency?: string;
        downTriggers?: string;
      };
      const qs = await generateQuestions(
        (p.tendency ?? "") + "\n" + (p.downTriggers ?? ""),
      );

      if (qs.length > 0) {
        await supabase.from("analysis_results").insert({
          user_id: userId,
          type: "question",
          period_from: null,
          period_to: null,
          prompt_version: PROMPT_VERSIONS.question,
          payload: { questions: qs },
        });
      }

      return NextResponse.json({ questions: qs });
    }

    // ── 年次レポート ──
    if (type === "yearly") {
      const { from: defaultFrom, to: defaultTo } = getLast12MonthsRangeInTokyo();
      const fromParam = (body?.from ?? defaultFrom).toString();
      const toParam = (body?.to ?? defaultTo).toString();

      const { data: existingYearly } = await supabase
        .from("analysis_results")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "yearly")
        .eq("period_from", fromParam)
        .eq("period_to", toParam)
        .limit(1);

      if (existingYearly && existingYearly.length > 0) {
        return NextResponse.json(
          {
            error: "rate_limit",
            message: "この期間の年次レポートは既に生成済みです。",
          },
          { status: 429 },
        );
      }

      const monthlyRows = await supabase
        .from("analysis_results")
        .select("period_from, period_to, payload, created_at")
        .eq("user_id", userId)
        .eq("type", "monthly")
        .lte("period_from", toParam)
        .gte("period_to", fromParam)
        .order("period_from", { ascending: true });

      const weeklyRows = await supabase
        .from("analysis_results")
        .select("period_from, period_to, payload, created_at")
        .eq("user_id", userId)
        .eq("type", "weekly")
        .lte("period_from", toParam)
        .gte("period_to", fromParam)
        .order("period_from", { ascending: true });

      type Row = { period_from: string; period_to: string; payload: unknown; created_at: string };
      const monthly = (monthlyRows.data ?? []) as Row[];
      const weekly = (weeklyRows.data ?? []) as Row[];
      const allRows = [...monthly.map((r) => ({ ...r, kind: "monthly" as const })), ...weekly.map((r) => ({ ...r, kind: "weekly" as const }))].sort(
        (a, b) => a.period_from.localeCompare(b.period_from) || a.created_at.localeCompare(b.created_at),
      );

      const lines: string[] = [];
      let totalLen = 0;
      for (const row of allRows) {
        if (totalLen >= YEARLY_INPUT_MAX) break;
        const p = (row.payload ?? {}) as Record<string, unknown>;
        let insight = "";
        let patterns = "";
        if (row.kind === "weekly") {
          insight = String(p.weeklyInsight ?? "").slice(0, YEARLY_SUMMARY_MAX);
          patterns = (Array.isArray(p.thoughtPatterns) ? p.thoughtPatterns : []).slice(0, 5).join("、");
        } else {
          insight = String(p.monthlyInsight ?? "").slice(0, YEARLY_SUMMARY_MAX);
          patterns = (Array.isArray(p.recurringThoughtPatterns) ? p.recurringThoughtPatterns : []).slice(0, 5).join("、");
        }
        const line = `[${row.period_from}〜${row.period_to}] ${row.kind === "monthly" ? "月次" : "週次"}: ${insight}${patterns ? ` パターン: ${patterns}` : ""}`;
        lines.push(line);
        totalLen += line.length + 1;
      }

      const inputSummary = lines.join("\n").slice(0, YEARLY_INPUT_MAX) || null;
      if (!inputSummary || inputSummary.trim().length === 0) {
        return NextResponse.json(
          {
            error: "insufficient_data",
            message:
              "対象期間に週次・月次レポートがありません。先に週次または月次レポートを生成してから再度お試しください。",
          },
          { status: 400 },
        );
      }

      const payload = await generateYearlyAnalysis(inputSummary, fromParam, toParam);

      const { data: inserted, error: insertErr } = await supabase
        .from("analysis_results")
        .insert({
          user_id: userId,
          type: "yearly",
          period_from: fromParam,
          period_to: toParam,
          prompt_version: PROMPT_VERSIONS.yearly,
          payload,
        })
        .select("id, type, period_from, period_to, payload, created_at")
        .single();

      if (insertErr) {
        return NextResponse.json(
          { error: "db_error", message: "データの保存に失敗しました。" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        id: inserted.id,
        type: inserted.type,
        period: { from: inserted.period_from, to: inserted.period_to },
        payload: inserted.payload,
        createdAt: inserted.created_at,
      });
    }

    return NextResponse.json(
      { error: "validation", message: "不明な type です。" },
      { status: 400 },
    );
  } catch (e) {
    logger.errorException("[analysis/generate POST] 分析生成でエラー", e);
    return NextResponse.json(
      { error: "internal", message: "分析の生成に失敗しました。" },
      { status: 500 },
    );
  }
}

// ── ヘルパー関数 ──

/**
 * クールダウンチェック（指定日数以内に同タイプの生成がないか確認）
 */
async function checkCooldown(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  type: string,
  days: number,
  message: string,
) {
  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: recent } = await supabase
    .from("analysis_results")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);

  if (recent && recent.length > 0) {
    const nextAvailable = new Date(
      new Date(recent[0].created_at).getTime() + days * 24 * 60 * 60 * 1000,
    );
    return NextResponse.json(
      {
        error: "rate_limit",
        message,
        nextAvailable: nextAvailable.toISOString(),
      },
      { status: 429 },
    );
  }

  return null;
}

/**
 * ジャーナル分析リトライ: 今日のエントリーに対して分析を再実行
 */
async function retryJournalAnalysis(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
) {
  const postedAt = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Tokyo",
  });

  const { data: entry } = await supabase
    .from("entries")
    .select("id, body")
    .eq("user_id", userId)
    .eq("posted_at", postedAt)
    .limit(1)
    .maybeSingle();

  if (!entry) {
    return NextResponse.json(
      { error: "not_found", message: "今日のエントリーが見つかりません。" },
      { status: 404 },
    );
  }

  const plainBody = isEncryptionConfigured() ? decrypt(entry.body) : entry.body;

  const result = await generateJournalAnalysis(plainBody);

  // 既存の daily 分析があれば削除してから再挿入
  await supabase
    .from("analysis_results")
    .delete()
    .eq("user_id", userId)
    .eq("type", "daily")
    .eq("period_from", postedAt)
    .eq("period_to", postedAt);

  await supabase.from("analysis_results").insert({
    user_id: userId,
    type: "daily",
    period_from: postedAt,
    period_to: postedAt,
    prompt_version: PROMPT_VERSIONS.daily,
    payload: {
      summary: result.summary,
      primaryEmotion: result.primaryEmotion,
      secondaryEmotion: result.secondaryEmotion,
      thoughtPatterns: result.thoughtPatterns,
      tension: result.tension,
      metaInsight: result.metaInsight,
      question: result.question,
    },
  });

  await supabase.from("emotion_tags").delete().eq("entry_id", entry.id);
  for (const tag of [result.primaryEmotion, result.secondaryEmotion]) {
    if (!tag || !tag.trim()) continue;
    await supabase.from("emotion_tags").insert({
      user_id: userId,
      entry_id: entry.id,
      tag: tag.slice(0, 200),
    });
  }

  return NextResponse.json({
    type: "daily",
    payload: {
      summary: result.summary,
      primaryEmotion: result.primaryEmotion,
      secondaryEmotion: result.secondaryEmotion,
      thoughtPatterns: result.thoughtPatterns,
      tension: result.tension,
      metaInsight: result.metaInsight,
      question: result.question,
    },
  });
}

/**
 * 日次分析データを取得してテキスト化する共通処理
 */
async function collectDailySummaryLines(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  fromParam: string,
  toParam: string,
): Promise<string[] | null> {
  const { data: journalRows } = await supabase
    .from("analysis_results")
    .select("period_from, payload")
    .eq("user_id", userId)
    .eq("type", "daily")
    .gte("period_from", fromParam)
    .lte("period_to", toParam)
    .order("period_from", { ascending: true });

  const lines: string[] = [];
  for (const row of journalRows ?? []) {
    const p = row.payload as {
      summary?: string;
      primaryEmotion?: string;
      secondaryEmotion?: string;
      thoughtPatterns?: string[];
    };
    const date = row.period_from;
    const line = `${date}: ${truncateCommentForSummary(p.summary ?? "", 80)} 感情: ${(p.primaryEmotion ?? "").slice(0, 60)} / ${(p.secondaryEmotion ?? "").slice(0, 60)}. ${(p.thoughtPatterns ?? []).join(" ").slice(0, 120)}`;
    lines.push(line);
  }

  return lines.length > 0 ? lines : null;
}

/**
 * 週次レポート生成
 */
async function generateWeeklyReport(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  fromParam: string,
  toParam: string,
) {
  const lines = await collectDailySummaryLines(supabase, userId, fromParam, toParam);
  if (!lines) {
    return NextResponse.json(
      {
        error: "insufficient_data",
        message:
          "この期間のふりかえりデータがありません。ふりかえりを追加してから再度お試しください。",
      },
      { status: 400 },
    );
  }

  const payload = await generateWeeklyAnalysis(lines.join("\n"), fromParam, toParam);

  const { data: inserted, error: insertErr } = await supabase
    .from("analysis_results")
    .insert({
      user_id: userId,
      type: "weekly",
      period_from: fromParam,
      period_to: toParam,
      prompt_version: PROMPT_VERSIONS.weekly,
      payload,
    })
    .select("id, type, period_from, period_to, payload, created_at")
    .single();

  if (insertErr) {
    return NextResponse.json(
      { error: "db_error", message: "データの保存に失敗しました。" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: inserted.id,
    type: inserted.type,
    period: { from: inserted.period_from, to: inserted.period_to },
    payload: inserted.payload,
    createdAt: inserted.created_at,
  });
}

/**
 * 月次レポート生成
 */
async function generateMonthlyReport(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  fromParam: string,
  toParam: string,
) {
  const lines = await collectDailySummaryLines(supabase, userId, fromParam, toParam);
  if (!lines) {
    return NextResponse.json(
      {
        error: "insufficient_data",
        message:
          "この期間のふりかえりデータがありません。ふりかえりを追加してから再度お試しください。",
      },
      { status: 400 },
    );
  }

  const payload = await generateMonthlyAnalysis(lines.join("\n"), fromParam, toParam);

  const { data: inserted, error: insertErr } = await supabase
    .from("analysis_results")
    .insert({
      user_id: userId,
      type: "monthly",
      period_from: fromParam,
      period_to: toParam,
      prompt_version: PROMPT_VERSIONS.monthly,
      payload,
    })
    .select("id, type, period_from, period_to, payload, created_at")
    .single();

  if (insertErr) {
    return NextResponse.json(
      { error: "db_error", message: "データの保存に失敗しました。" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: inserted.id,
    type: inserted.type,
    period: { from: inserted.period_from, to: inserted.period_to },
    payload: inserted.payload,
    createdAt: inserted.created_at,
  });
}
