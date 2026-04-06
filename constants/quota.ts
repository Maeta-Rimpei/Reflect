/**
 * `quota_usage.quota_key` に入る値（DB の値と一致させること）。
 * 意味: 日次ふりかえりを保存したあとの「再分析」を、東京暦月あたり何回まで許すか。
 */
export const QUOTA_KEY_MONTHLY_DAILY_JOURNAL_REGENERATION =
  "monthly_daily_journal_regeneration";

/** 上記クォータの、ユーザーあたり東京暦月の上限回数 */
export const DAILY_JOURNAL_REGENERATION_MONTHLY_LIMIT = 3;
