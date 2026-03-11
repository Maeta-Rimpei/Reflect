/** 履歴・一覧で使うエントリー1件（API /api/v1/entries の要素） */
export interface EntryItem {
  id: string;
  body: string;
  wordCount: number;
  /** 投稿日 YYYY-MM-DD */
  postedAt: string;
  createdAt: string;
  mood: string | null;
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
}
