/**
 * 分析プロンプトのバージョン管理。
 * 各分析タイプごとにバージョン文字列を定義し、
 * analysis_results テーブルの prompt_version カラムに保存する。
 */
export const PROMPT_VERSIONS = {
  daily: "daily-v1",
  weekly: "weekly-v1",
  monthly: "monthly-v1",
  yearly: "yearly-v1",
  personality: "personality-v1",
  question: "question-v1",
} as const;

export type PromptVersionKey = keyof typeof PROMPT_VERSIONS;
