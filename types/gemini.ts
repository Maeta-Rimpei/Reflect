import type {
  PersonalityData,
  WeeklyPayload,
  MonthlyPayload,
  YearlyPayload,
} from "./analysis";

/** Gemini ジャーナル分析 API の戻り値（感情・思考傾向・コメント） */
export interface GeminiJournalAnalysisPayload {
  /** 今日の出来事の構造的要約 */
  summary?: string;
  /** 主な感情とその背景 */
  primaryEmotion?: string;
  /** 主感情の裏にある揺れや補助的感情 */
  secondaryEmotion?: string;
  /** 観察される思考傾向（最大2つ、「〜傾向が見られる」形式） */
  thoughtPatterns?: string[];
  /** 文中の矛盾・葛藤があれば指摘 */
  tension?: string;
  /** ユーザーがまだ明確に言語化していない可能性のある視点を1文 */
  metaInsight?: string;
  /** 最後に1つだけ問いを置く（行動提案は禁止） */
  question?: string;
}

/** 日次分析 API レスポンス（全項目必須） */
export type DailyAnalysisResponse = Required<
  Pick<
    GeminiJournalAnalysisPayload,
    | "summary"
    | "primaryEmotion"
    | "secondaryEmotion"
    | "thoughtPatterns"
    | "tension"
    | "metaInsight"
    | "question"
  >
>;

/** analysis_results の daily 用 payload */
export type DailyAnalysisPayloadFromDb = GeminiJournalAnalysisPayload;

/** 週次レポートの Gemini 生成結果 */
export type WeeklyAnalysisPayload = WeeklyPayload;

/** 月次レポートの Gemini 生成結果 */
export type MonthlyAnalysisPayload = MonthlyPayload;

/** 年次レポートの Gemini 生成結果 */
export type YearlyAnalysisPayload = YearlyPayload;

/** 人格サマリーの生成結果（API 戻り値。updatedAt はアプリで付与） */
export type PersonalityPayload = Omit<PersonalityData, "updatedAt">;
