/**
 * quota_usage テーブルへの読み書き（種類 B の月次カウント）。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getYearMonthInTokyo } from "@/lib/date-utils";
import {
  DAILY_JOURNAL_REGENERATION_MONTHLY_LIMIT,
  QUOTA_KEY_MONTHLY_DAILY_JOURNAL_REGENERATION,
} from "@/constants/quota";

export function getJournalRegenerationBLimit(): number {
  return DAILY_JOURNAL_REGENERATION_MONTHLY_LIMIT;
}

/** 種類 B の今月残り回数（東京暦月） */
export async function getJournalRegenerationBRemaining(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const used = await getJournalRegenerationBUsed(supabase, userId);
  return Math.max(0, getJournalRegenerationBLimit() - used);
}

/** 今月（東京）の種類 B 利用回数 */
export async function getJournalRegenerationBUsed(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const period = getYearMonthInTokyo();
  const { data } = await supabase
    .from("quota_usage")
    .select("used_count")
    .eq("user_id", userId)
    .eq("quota_key", QUOTA_KEY_MONTHLY_DAILY_JOURNAL_REGENERATION)
    .eq("period", period)
    .maybeSingle();

  return data?.used_count ?? 0;
}

/** 種類 B が 1 回成功したあとに呼ぶ（used_count を +1） */
export async function incrementJournalRegenerationB(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const period = getYearMonthInTokyo();
  const used = await getJournalRegenerationBUsed(supabase, userId);
  const next = used + 1;
  const { error } = await supabase.from("quota_usage").upsert(
    {
      user_id: userId,
      quota_key: QUOTA_KEY_MONTHLY_DAILY_JOURNAL_REGENERATION,
      period,
      used_count: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,quota_key,period" },
  );
  if (error) throw error;
}
