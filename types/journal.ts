import type { Plan } from "@/types/plan";
import type { GeminiJournalAnalysisPayload } from "./gemini";

/** ジャーナル分析結果（AI簡易分析）。generateJournalAnalysis の戻り値と同一 */
export interface JournalAnalysis extends GeminiJournalAnalysisPayload {}

/** 今日のふりかえりエントリー（保存済み表示用） */
export interface TodayEntry {
  /** エントリー ID（再分析 API 等） */
  id: string;
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
  plan: Plan;
  /** DB に日次分析が保存されているか（種類 A / B の表示分岐） */
  hasDailyAnalysis: boolean;
  /** 種類 B（成功後の再分析）の今月残り回数（東京暦月） */
  journalRegenerationBRemaining: number;
  /** 種類 B の月あたり上限 */
  journalRegenerationBLimit: number;
}
