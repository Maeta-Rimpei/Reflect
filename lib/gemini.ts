/**
 * Gemini API を用いたふりかえり分析（日次・週次・月次・人格・問いかけ）の生成モジュール。
 * プロンプト本文は lib/prompts.ts に集約している。
 */
import { GoogleGenAI, Type } from "@google/genai";
import { logger } from "@/lib/logger";
import {
  buildJournalPrompt,
  buildWeeklyPrompt,
  buildMonthlyPrompt,
  buildYearlyPrompt,
  buildPersonalityPrompt,
  buildQuestionsPrompt,
} from "@/lib/prompts";
import type {
  GeminiJournalAnalysisPayload,
  PersonalityPayload,
  WeeklyAnalysisPayload,
  MonthlyAnalysisPayload,
  YearlyAnalysisPayload,
} from "@/types/gemini";

/** 環境変数 GEMINI_API_KEY（未設定時は分析機能は利用不可） */
const apiKey = process.env.GEMINI_API_KEY;
/** 利用するモデル名 */
const MODEL = "gemini-2.5-flash";

if (!apiKey) {
  logger.warn(
    "[gemini] GEMINI_API_KEY が未設定です。LLM による分析は利用できません。",
  );
}

/** Gemini クライアント（API キーがある場合のみ生成） */
const genAI = apiKey ? new GoogleGenAI({ apiKey }) : null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * 生成結果からテキスト部分を取得する。
 * @param result - generateContent の戻り値
 * @returns 最初の候補のテキスト、なければ空文字列
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(result: any): string {
  return (
    result?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  );
}

/**
 * レスポンス文字列から JSON を抽出してパースする。コードブロックや前後の文字列があっても対応。
 * @param text - モデル出力の文字列
 * @returns パースしたオブジェクトまたは配列
 * @throws  JSON が見つからない場合
 */
function parseJson(text: string, context: string): unknown {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = codeBlock ? codeBlock[1] : text;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(candidate.slice(first, last + 1));
    } catch (e) {
      logger.errorException(`[gemini] JSON.parse 失敗 (${context})`, e, {
        responseLength: text.length,
        textPreview: text.slice(0, 200),
      });
      throw e;
    }
  }
  const firstArr = candidate.indexOf("[");
  const lastArr = candidate.lastIndexOf("]");
  if (firstArr !== -1 && lastArr > firstArr) {
    try {
      return JSON.parse(candidate.slice(firstArr, lastArr + 1));
    } catch (e) {
      logger.errorException(`[gemini] JSON.parse 失敗 (${context})`, e, {
        responseLength: text.length,
        textPreview: text.slice(0, 200),
      });
      throw e;
    }
  }
  logger.error("[gemini] モデル応答に JSON が見つからない", {
    context,
    model: MODEL,
    responseLength: text.length,
    textPreview: text.slice(0, 300),
  });
  throw new Error("No JSON found in model response");
}

// ---------------------------------------------------------------------------
// Journal Analysis (Free)
// ---------------------------------------------------------------------------

/**
 * ふりかえり本文からジャーナル分析を生成する。Free プランで利用。
 * @param journalBody - ユーザーが入力したふりかえり本文
 * @returns 感情・思考傾向・コメント
 * @throws GEMINI_API_KEY 未設定時
 */
export async function generateJournalAnalysis(
  journalBody: string,
): Promise<GeminiJournalAnalysisPayload> {
  if (!genAI) {
    logger.error("[gemini] GEMINI_API_KEY 未設定", {
      fn: "generateJournalAnalysis",
      model: MODEL,
      journalBodyLength: journalBody.length,
    });
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const prompt = buildJournalPrompt(journalBody);

  const result = await genAI.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          primaryEmotion: { type: Type.STRING },
          secondaryEmotion: { type: Type.STRING },
          thoughtPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
          tension: { type: Type.STRING },
          metaInsight: { type: Type.STRING },
          question: { type: Type.STRING },
        },
        required: ["summary", "primaryEmotion", "secondaryEmotion", "thoughtPatterns", "tension", "metaInsight", "question"],
      },
    },
  });

  const text = extractText(result);
  const parsed = parseJson(text, "journalAnalysis") as {
    summary?: unknown;
    primaryEmotion?: unknown;
    secondaryEmotion?: unknown;
    thoughtPatterns?: unknown;
    tension?: unknown;
    metaInsight?: unknown;
    question?: unknown;
  };

  return {
    summary: parsed.summary ? String(parsed.summary) : "",
    primaryEmotion: parsed.primaryEmotion ? String(parsed.primaryEmotion) : "",
    secondaryEmotion: parsed.secondaryEmotion ? String(parsed.secondaryEmotion) : "",
    thoughtPatterns: Array.isArray(parsed.thoughtPatterns)
      ? parsed.thoughtPatterns.map(String).filter(Boolean)
      : [],
    tension: parsed.tension ? String(parsed.tension) : "",
    metaInsight: parsed.metaInsight ? String(parsed.metaInsight) : "",
    question: parsed.question ? String(parsed.question) : "",
  };
}

// ---------------------------------------------------------------------------
// Weekly Analysis (Deep)
// ---------------------------------------------------------------------------

/**
 * 日次サマリから週次レポートを生成する。Deep プランで利用。
 * @param inputSummary - 期間内の日次分析を連結したテキスト
 * @param periodFrom - 対象期間の開始日（YYYY-MM-DD）
 * @param periodTo - 対象期間の終了日（YYYY-MM-DD）
 * @returns 感情分布・思考パターン・ストレストリガー・矛盾・週次洞察
 * @throws GEMINI_API_KEY 未設定時
 */
export async function generateWeeklyAnalysis(
  inputSummary: string,
  periodFrom: string,
  periodTo: string,
): Promise<WeeklyAnalysisPayload> {
  if (!genAI) {
    logger.error("[gemini] GEMINI_API_KEY 未設定", {
      fn: "generateWeeklyAnalysis",
      model: MODEL,
      periodFrom,
      periodTo,
      inputSummaryLength: inputSummary.length,
    });
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const prompt = buildWeeklyPrompt(periodFrom, periodTo, inputSummary);

  const result = await genAI.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          emotionDistribution: { type: Type.ARRAY, items: { type: Type.STRING } },
          thoughtPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
          stressTriggers: { type: Type.ARRAY, items: { type: Type.STRING } },
          notableContradictions: { type: Type.ARRAY, items: { type: Type.STRING } },
          weeklyInsight: { type: Type.STRING },
        },
        required: ["emotionDistribution", "thoughtPatterns", "stressTriggers", "notableContradictions", "weeklyInsight"],
      },
    },
  });

  const text = extractText(result);
  const parsed = parseJson(text, "weeklyAnalysis") as Record<string, unknown>;

  return {
    emotionDistribution: Array.isArray(parsed.emotionDistribution)
      ? parsed.emotionDistribution.map(String).filter(Boolean)
      : [],
    thoughtPatterns: Array.isArray(parsed.thoughtPatterns)
      ? parsed.thoughtPatterns.map(String).filter(Boolean)
      : [],
    stressTriggers: Array.isArray(parsed.stressTriggers)
      ? parsed.stressTriggers.map(String).filter(Boolean)
      : [],
    notableContradictions: Array.isArray(parsed.notableContradictions)
      ? parsed.notableContradictions.map(String).filter(Boolean)
      : [],
    weeklyInsight: parsed.weeklyInsight ? String(parsed.weeklyInsight) : "",
  };
}

// ---------------------------------------------------------------------------
// Monthly Analysis (Deep)
// ---------------------------------------------------------------------------

/**
 * 日次サマリから月次レポートを生成する。Deep プランで利用。
 * @param inputSummary - 期間内の日次分析を連結したテキスト
 * @param periodFrom - 対象期間の開始日（YYYY-MM-DD）
 * @param periodTo - 対象期間の終了日（YYYY-MM-DD）
 * @returns 支配的感情・再帰思考パターン・行動パターン・ストレス源ランキング・月次洞察
 * @throws GEMINI_API_KEY 未設定時
 */
export async function generateMonthlyAnalysis(
  inputSummary: string,
  periodFrom: string,
  periodTo: string,
): Promise<MonthlyAnalysisPayload> {
  if (!genAI) {
    logger.error("[gemini] GEMINI_API_KEY 未設定", {
      fn: "generateMonthlyAnalysis",
      model: MODEL,
      periodFrom,
      periodTo,
      inputSummaryLength: inputSummary.length,
    });
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const prompt = buildMonthlyPrompt(periodFrom, periodTo, inputSummary);

  const result = await genAI.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          dominantEmotions: { type: Type.ARRAY, items: { type: Type.STRING } },
          recurringThoughtPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
          behaviorPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
          stressSourcesRanking: { type: Type.ARRAY, items: { type: Type.STRING } },
          monthlyInsight: { type: Type.STRING },
        },
        required: ["dominantEmotions", "recurringThoughtPatterns", "behaviorPatterns", "stressSourcesRanking", "monthlyInsight"],
      },
    },
  });

  const text = extractText(result);
  const parsed = parseJson(text, "monthlyAnalysis") as Record<string, unknown>;

  return {
    dominantEmotions: Array.isArray(parsed.dominantEmotions)
      ? parsed.dominantEmotions.map(String).filter(Boolean)
      : [],
    recurringThoughtPatterns: Array.isArray(parsed.recurringThoughtPatterns)
      ? parsed.recurringThoughtPatterns.map(String).filter(Boolean)
      : [],
    behaviorPatterns: Array.isArray(parsed.behaviorPatterns)
      ? parsed.behaviorPatterns.map(String).filter(Boolean)
      : [],
    stressSourcesRanking: Array.isArray(parsed.stressSourcesRanking)
      ? parsed.stressSourcesRanking.map(String).filter(Boolean)
      : [],
    monthlyInsight: parsed.monthlyInsight ? String(parsed.monthlyInsight) : "",
  };
}

// ---------------------------------------------------------------------------
// Yearly Analysis (Deep)
// ---------------------------------------------------------------------------

/**
 * 週次・月次サマリの連結テキストから年次レポートを生成する。Deep プランで利用。
 * @param inputSummary - 対象期間内の週次・月次レポートをテキスト化したもの
 * @param periodFrom - 対象期間の開始日（YYYY-MM-DD）
 * @param periodTo - 対象期間の終了日（YYYY-MM-DD）
 * @returns 思考傾向・感情推移・ストレス源ランキング・動機・特性
 * @throws GEMINI_API_KEY 未設定時
 */
export async function generateYearlyAnalysis(
  inputSummary: string,
  periodFrom: string,
  periodTo: string,
): Promise<YearlyAnalysisPayload> {
  if (!genAI) {
    logger.error("[gemini] GEMINI_API_KEY 未設定", {
      fn: "generateYearlyAnalysis",
      model: MODEL,
      periodFrom,
      periodTo,
      inputSummaryLength: inputSummary.length,
    });
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const prompt = buildYearlyPrompt(periodFrom, periodTo, inputSummary);

  const result = await genAI.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          coreThoughtPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
          emotionTrend: { type: Type.STRING },
          stressSourcesRanking: { type: Type.ARRAY, items: { type: Type.STRING } },
          motivationDrivers: { type: Type.ARRAY, items: { type: Type.STRING } },
          identityTraits: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["coreThoughtPatterns", "emotionTrend", "stressSourcesRanking", "motivationDrivers", "identityTraits"],
      },
    },
  });

  const text = extractText(result);
  const parsed = parseJson(text, "yearlyAnalysis") as Record<string, unknown>;

  return {
    coreThoughtPatterns: Array.isArray(parsed.coreThoughtPatterns)
      ? parsed.coreThoughtPatterns.map(String).filter(Boolean)
      : [],
    emotionTrend: parsed.emotionTrend ? String(parsed.emotionTrend) : "",
    stressSourcesRanking: Array.isArray(parsed.stressSourcesRanking)
      ? parsed.stressSourcesRanking.map(String).filter(Boolean)
      : [],
    motivationDrivers: Array.isArray(parsed.motivationDrivers)
      ? parsed.motivationDrivers.map(String).filter(Boolean)
      : [],
    identityTraits: Array.isArray(parsed.identityTraits)
      ? parsed.identityTraits.map(String).filter(Boolean)
      : [],
  };
}

// ---------------------------------------------------------------------------
// Personality Summary (Deep)
// ---------------------------------------------------------------------------

/**
 * 年次分析から人格サマリーを生成する。Deep プランで利用。
 * @param summariesInput - 年次分析サマリを連結したテキスト
 * @returns 傾向・強みシグナル・リスクパターン・落ち込み条件・回復行動
 * @throws GEMINI_API_KEY 未設定時
 */
export async function generatePersonalitySummary(
  summariesInput: string,
): Promise<PersonalityPayload> {
  if (!genAI) {
    logger.error("[gemini] GEMINI_API_KEY 未設定", {
      fn: "generatePersonalitySummary",
      model: MODEL,
      summariesInputLength: summariesInput.length,
    });
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const prompt = buildPersonalityPrompt(summariesInput);

  const result = await genAI.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tendency: { type: Type.STRING },
          strengthSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
          riskPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
          downTriggers: { type: Type.STRING },
          recoveryActions: { type: Type.STRING },
        },
        required: ["tendency", "strengthSignals", "riskPatterns", "downTriggers", "recoveryActions"],
      },
    },
  });

  const text = extractText(result);
  const parsed = parseJson(text, "personalitySummary") as Record<string, unknown>;

  return {
    tendency: parsed.tendency ? String(parsed.tendency) : "",
    strengthSignals: Array.isArray(parsed.strengthSignals)
      ? parsed.strengthSignals.map(String).filter(Boolean)
      : [],
    riskPatterns: Array.isArray(parsed.riskPatterns)
      ? parsed.riskPatterns.map(String).filter(Boolean)
      : [],
    downTriggers: parsed.downTriggers ? String(parsed.downTriggers) : "",
    recoveryActions: parsed.recoveryActions ? String(parsed.recoveryActions) : "",
  };
}

// ---------------------------------------------------------------------------
// Questions (Deep)
// ---------------------------------------------------------------------------

/**
 * 分析結果に基づき、気づきを促す「問いかけ」を1〜3個生成する。Deep プランで利用。
 * @param inputSummary - 人格サマリーの傾向・落ち込み条件など（テキスト）
 * @returns 問いかけの文言の配列
 * @throws GEMINI_API_KEY 未設定時
 */
export async function generateQuestions(inputSummary: string): Promise<string[]> {
  if (!genAI) {
    logger.error("[gemini] GEMINI_API_KEY 未設定", {
      fn: "generateQuestions",
      model: MODEL,
      inputSummaryLength: inputSummary.length,
    });
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const prompt = buildQuestionsPrompt(inputSummary);

  const result = await genAI.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });

  const text = extractText(result);
  const parsed = parseJson(text, "questions");
  return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
}
