/** 週次レポートの payload */
export interface WeeklyPayload {
  /** 今週多く見られた感情（最大3件） */
  emotionDistribution: string[];
  /** 思考の傾向（3〜5件） */
  thoughtPatterns: string[];
  /** ストレスのきっかけ（最大5件） */
  stressTriggers: string[];
  /** 行動や思考の矛盾（最大3件） */
  notableContradictions: string[];
  /** 今週の観察結果（2〜3文） */
  weeklyInsight: string;
}

/** 月次レポートの payload */
export interface MonthlyPayload {
  /** 月全体で目立った感情（最大3件） */
  dominantEmotions: string[];
  /** 繰り返し現れる思考傾向（3〜5件） */
  recurringThoughtPatterns: string[];
  /** 観察された行動パターン（3〜5件） */
  behaviorPatterns: string[];
  /** ストレス源ランキング（最大5件） */
  stressSourcesRanking: string[];
  /** 月全体の洞察（3〜4文） */
  monthlyInsight: string;
}

/** 年次レポートの payload */
export interface YearlyPayload {
  /** 年間の思考傾向 */
  coreThoughtPatterns: string[];
  /** 感情の推移 */
  emotionTrend: string;
  /** 年間のストレス源ランキング */
  stressSourcesRanking: string[];
  /** 行動の動機 */
  motivationDrivers: string[];
  /** 観察された特性 */
  identityTraits: string[];
}

/** いずれかのレポートの payload（履歴リストで型を統一するため） */
export type AnyReportPayload = WeeklyPayload | MonthlyPayload | YearlyPayload;

/** 人格サマリーの payload（傾向・強みシグナル・リスクパターン・落ち込み条件・回復行動） */
export interface PersonalityData {
  /** 傾向のまとめ（3〜5文） */
  tendency: string;
  /** 観察された強みシグナル */
  strengthSignals: string[];
  /** 注意すべきリスクパターン */
  riskPatterns: string[];
  /** 落ち込みやすい条件 */
  downTriggers: string;
  /** 回復しやすい行動 */
  recoveryActions: string;
  /** 最終更新日時（ISO 文字列） */
  updatedAt?: string;
}

/** 分析ページの初回表示用データ（サーバー取得） */
export interface AnalysisInitialData {
  plan: "free" | "deep";
  weeklyReport: {
    period: { from: string; to: string };
    payload: WeeklyPayload;
  } | null;
  monthlyReport: {
    period: { from: string; to: string };
    payload: MonthlyPayload;
  } | null;
  yearlyReport: {
    period: { from: string; to: string };
    payload: YearlyPayload;
  } | null;
  personalitySummary: PersonalityData | null;
  questions: string[];
}

/** レポート履歴1件（API /api/v1/analysis の要素） */
export interface AnalysisReportItem {
  id: string;
  type: string;
  period: { from: string; to: string };
  payload: AnyReportPayload;
  createdAt: string;
}

/** 人格サマリー / 問いかけの履歴1件（period を持たない） */
export interface AnalysisHistoryMiscItem {
  id: string;
  type: string;
  payload: PersonalityData | { questions: string[] };
  createdAt: string;
}

/** レポート履歴ページの初回表示用データ（サーバー取得） */
export interface AnalysisHistoryInitialData {
  lists: {
    weekly: AnalysisReportItem[];
    monthly: AnalysisReportItem[];
    yearly: AnalysisReportItem[];
    personality: AnalysisHistoryMiscItem[];
    question: AnalysisHistoryMiscItem[];
  };
}
