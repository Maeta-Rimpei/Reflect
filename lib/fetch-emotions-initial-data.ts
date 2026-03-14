/**
 * 感情ログページの初回表示用データをサーバー側で取得する。
 * Supabase を直接利用する。
 */
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { getLast7DaysRangeInTokyo, getNextDay } from "@/lib/date-utils";
import type { EmotionsInitialData } from "@/types/emotions";
import type { EmotionRow } from "@/types/entry";

/**
 * 直近7日の感情ログを取得する。
 * @param userId - 認証済みユーザー ID
 */
export async function fetchEmotionsInitialData(
  userId: string,
): Promise<EmotionsInitialData> {
  if (!isSupabaseAdminConfigured()) {
    return { emotionLog: [] };
  }

  const { from, to } = getLast7DaysRangeInTokyo();
  const supabase = createSupabaseAdminClient();

  const { data: entriesInRange } = await supabase
    .from("entries")
    .select("id, posted_at")
    .eq("user_id", userId)
    .gte("posted_at", from)
    .lt("posted_at", getNextDay(to));

  const entryIds = (entriesInRange ?? []).map((e) => e.id);
  if (entryIds.length === 0) {
    return { emotionLog: [] };
  }

  const [tagsRes, moodsRes] = await Promise.all([
    supabase
      .from("emotion_tags")
      .select("entry_id, tag, created_at")
      .eq("user_id", userId)
      .in("entry_id", entryIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("moods")
      .select("entry_id, value")
      .eq("user_id", userId)
      .in("entry_id", entryIds),
  ]);

  const entryByPost = new Map(
    (entriesInRange ?? []).map((e) => [e.id, e.posted_at]),
  );
  const moodsByEntry = new Map<string, string>();
  for (const m of moodsRes.data ?? []) {
    moodsByEntry.set(m.entry_id, m.value);
  }

  const byDate = new Map<
    string,
    { date: string; mood: string | null; tags: string[] }
  >();
  for (const entry of entriesInRange ?? []) {
    const postedAt = entry.posted_at;
    if (!byDate.has(postedAt)) {
      byDate.set(postedAt, {
        date: postedAt,
        mood: moodsByEntry.get(entry.id) ?? null,
        tags: [],
      });
    }
  }
  for (const t of tagsRes.data ?? []) {
    const postedAt = entryByPost.get(t.entry_id);
    if (!postedAt) continue;
    const row = byDate.get(postedAt);
    if (row && !row.tags.includes(t.tag)) {
      row.tags.push(t.tag);
    }
  }

  const emotionLog: EmotionRow[] = [...byDate.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, v]) => v);

  return { emotionLog };
}
