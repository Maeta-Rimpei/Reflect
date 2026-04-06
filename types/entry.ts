import type { Plan } from "@/types/plan";
import type { JournalAnalysis } from "./journal";

/** 履歴・一覧で使うエントリー1件（API /api/v1/entries の要素） */
export interface EntryItem {
  id: string;
  body: string;
  wordCount: number;
  /** 投稿日 YYYY-MM-DD */
  postedAt: string;
  createdAt: string;
  mood: string | null;
  /** 当該日の日次分析が DB にあるか */
  hasDailyAnalysis: boolean;
  /** 日次分析の内容（analysis_results の payload） */
  dailyAnalysis: JournalAnalysis | null;
}

/** 感情ログ1日分（API /api/v1/emotions の要素） */
export interface EmotionRow {
  /** 日付 YYYY-MM-DD */
  date: string;
  mood: string | null;
  /** AI 分析の感情テキスト（主・補など、文章で返る） */
  tags: string[];
}

/** 履歴ページの初回表示用データ（サーバー取得） */
export interface HistoryInitialData {
  entries: EntryItem[];
  emotions: EmotionRow[];
  /** 表示月中でエントリがある「日」のリスト（1〜31）。クライアントで Set に復元する */
  entryDates: number[];
  isFreeLimit: boolean;
  viewMonth: number;
  viewYear: number;
  plan: Plan;
  /** 種類 B の今月残り回数 */
  journalRegenerationBRemaining: number;
  journalRegenerationBLimit: number;
}

/** 履歴範囲取得のパラメータ（API と fetchHistoryRangeData で共通） */
export interface FetchHistoryRangeParams {
  from: string;
  to: string;
  viewMonth: number;
  viewYear: number;
}
