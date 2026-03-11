import type { GeminiJournalAnalysisPayload } from "./gemini";

/** ジャーナル分析結果（AI簡易分析）。generateJournalAnalysis の戻り値と同一 */
export interface JournalAnalysis extends GeminiJournalAnalysisPayload {}

/** 今日のふりかえりエントリー（保存済み表示用） */
export interface TodayEntry {
  /** 本文 */
  body: string;
  /** 選択した気分（great / good / neutral / low / bad） */
  mood: string | null;
}

/** 継続日数カレンダーの曜日アイテム（日〜土の1週間） */
export interface WeekDayItem {
  /** 曜日ラベル（"月" など） */
  day: string;
  /** その日にエントリがあるか */
  done: boolean;
  /** 今日かどうか */
  today: boolean;
}

/** ジャーナル（今日のふりかえり）ページの初回表示用データ（サーバー取得） */
export interface JournalInitialData {
  weekDays: WeekDayItem[];
  /** 継続日数計算に使った「記録がある日」の一覧（YYYY-MM-DD）。保存時に今日を足して再計算するため */
  streakDates: string[];
  todayEntry: TodayEntry | null;
  analysis: JournalAnalysis | null;
  plan: "free" | "deep";
}
