import type { EmotionRow } from "./entry";

/** 感情ログページの初回表示用データ（サーバー取得） */
export interface EmotionsInitialData {
  emotionLog: EmotionRow[];
}
