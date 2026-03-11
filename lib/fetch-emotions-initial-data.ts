/**
 * 感情ログページの初回表示用データをサーバー側で取得する。
 * 直近7日の感情 API を叩き、日付・気分・感情の文章を返す。
 */
import { getLast7DaysRangeInTokyo } from "@/lib/date-utils";
import type { EmotionsInitialData } from "@/types/emotions";
import type { EmotionRow } from "@/types/entry";

/**
 * 直近7日の感情ログを取得する。
 * @param baseUrl - アプリのオリジン
 * @param cookieHeader - リクエストの Cookie ヘッダー
 */
export async function fetchEmotionsInitialData(
  baseUrl: string,
  cookieHeader: string,
): Promise<EmotionsInitialData> {
  const { from, to } = getLast7DaysRangeInTokyo();
  const headers = { Cookie: cookieHeader };

  const res = await fetch(
    `${baseUrl}/api/v1/emotions?from=${from}&to=${to}`,
    { headers, cache: "no-store" },
  );

  if (!res.ok) {
    return { emotionLog: [] };
  }

  const data = (await res.json()) as EmotionRow[];
  const emotionLog = Array.isArray(data) ? data : [];

  return { emotionLog };
}
