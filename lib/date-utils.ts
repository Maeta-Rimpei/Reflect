/** 東京のタイムゾーン識別子（日付計算の基準） */
const TZ_TOKYO = "Asia/Tokyo";

/** 2桁ゼロパディング用ヘルパー */
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 東京タイムゾーンでの「今日」の日付を返す。
 * @returns YYYY-MM-DD 形式の文字列
 */
export function getTodayInTokyo(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ_TOKYO });
}

/**
 * 東京タイムゾーンでの「今日」の年・月・日を返す（月は 0-indexed、JS Date と同様）。
 */
export function getTodayPartsInTokyo(): { year: number; month: number; day: number } {
  const today = getTodayInTokyo();
  const [y, m, d] = today.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

/**
 * 東京タイムゾーンでの直近7日分の日付文字列を返す（古い日付から [from, ..., to]）。
 */
export function getLast7DaysDateStringsInTokyo(): string[] {
  const { from, to } = getLast7DaysRangeInTokyo();
  const [yFrom, mFrom, dFrom] = from.split("-").map(Number);
  const fromDate = new Date(yFrom, mFrom - 1, dFrom);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  return out;
}

/**
 * 東京タイムゾーンでの「今週」の月曜〜日曜の日付範囲を返す。
 * 週は月曜始まり（ISO 8601）。
 * @returns from: 月曜日 YYYY-MM-DD, to: 日曜日 YYYY-MM-DD
 */
export function getWeekRangeInTokyo(): { from: string; to: string } {
  const today = getTodayInTokyo();
  const [y, m, d] = today.split("-").map(Number);
  const noonTokyo = new Date(`${today}T12:00:00+09:00`);
  const weekDayIndex = noonTokyo.getUTCDay();
  const mondayOffset = weekDayIndex === 0 ? -6 : 1 - weekDayIndex;
  const monday = new Date(y, m - 1, d + mondayOffset);
  const sunday = new Date(monday);
  
  sunday.setDate(monday.getDate() + 6);
  return {
    from: `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`,
    to: `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`,
  };
}

/**
 * 東京タイムゾーンでの「今月」の1日〜末日の日付範囲を返す。
 * @returns from: 月初 YYYY-MM-DD, to: 月末 YYYY-MM-DD
 */
export function getMonthRangeInTokyo(): { from: string; to: string } {
  const today = getTodayInTokyo();
  const [y, m] = today.split("-").map(Number);
  const lastDay = new Date(y, m, 0);
  return {
    from: `${y}-${pad(m)}-01`,
    to: `${y}-${pad(m)}-${pad(lastDay.getDate())}`,
  };
}

/**
 * 東京タイムゾーンでの「直近12ヶ月」の日付範囲を返す（今月を含む12ヶ月。年次レポート用）。
 * 例: 2026年2月時点 → from: 2025-03-01, to: 2026-02-28（今月末日）
 * @returns from: 12ヶ月前の月初 YYYY-MM-DD, to: 今月末日 YYYY-MM-DD
 */
export function getLast12MonthsRangeInTokyo(): { from: string; to: string } {
  const { to } = getMonthRangeInTokyo();
  const [y, m] = to.split("-").map(Number);
  const fromDate = new Date(y, m - 1 - 11, 1);
  return {
    from: `${fromDate.getFullYear()}-${pad(fromDate.getMonth() + 1)}-01`,
    to,
  };
}

/**
 * 東京タイムゾーンでの「直近7日」の日付範囲を返す（今日を含む7日間）。
 * Free プラン時の履歴・感情ログの範囲などで利用。
 * @returns from: 7日前 YYYY-MM-DD, to: 今日 YYYY-MM-DD
 */
export function getLast7DaysRangeInTokyo(): { from: string; to: string } {
  const to = getTodayInTokyo();
  const [y, m, d] = to.split("-").map(Number);
  const toDate = new Date(y, m - 1, d);
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - 6);
  return {
    from: `${fromDate.getFullYear()}-${pad(fromDate.getMonth() + 1)}-${pad(fromDate.getDate())}`,
    to,
  };
}

/**
 * 直近 N 日間の日付範囲を返す（今日を含む）。継続日数計算で Deep プラン時に利用。
 * @param days - 日数（例: 365）
 */
export function getLastNDaysRangeInTokyo(days: number): { from: string; to: string } {
  const to = getTodayInTokyo();
  const [y, m, d] = to.split("-").map(Number);
  const toDate = new Date(y, m - 1, d);
  const fromDate = new Date(toDate);
  fromDate.setDate(fromDate.getDate() - (days - 1));
  return {
    from: `${fromDate.getFullYear()}-${pad(fromDate.getMonth() + 1)}-${pad(fromDate.getDate())}`,
    to,
  };
}

/**
 * 日付文字列の前日を返す。
 * @param dateStr - YYYY-MM-DD
 * @returns 前日の YYYY-MM-DD
 */
export function getPreviousDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * 今日から遡った連続記録日数（ストリーク）を計算する。
 * 本日に記録がある場合は今日を終端、ない場合は昨日を終端として昨日・一昨日…と遡る。
 * @param todayStr - 今日の日付 YYYY-MM-DD
 * @param datesWithEntries - 記録がある日付のセット
 * @returns 連続日数（0 以上）
 */
export function getCurrentStreak(
  todayStr: string,
  datesWithEntries: Set<string>,
): number {
  const endDate = datesWithEntries.has(todayStr)
    ? todayStr
    : getPreviousDay(todayStr);
  let count = 0;
  let d = endDate;
  while (datesWithEntries.has(d)) {
    count++;
    d = getPreviousDay(d);
  }
  return count;
}

/**
 * 日付文字列を表示用の「Y年M月」形式に変換する。
 * @param dateStr - YYYY-MM-DD または YYYY-MM 形式
 * @returns 例: "2025年2月"
 */
export function getMonthLabel(dateStr: string): string {
  const [y, m] = dateStr.split("-");
  return `${y}年${Number(m)}月`;
}

/**
 * YYYY-MM-DD を yyyy年MM月dd日 にフォーマットする。
 * @param dateStr - YYYY-MM-DD 形式
 * @returns 例: "2025年03月01日"
 */
export function formatDateJp(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}年${pad(m)}月${pad(d)}日`;
}

/**
 * YYYY-MM-DD を yyyy年MM月 にフォーマットする。
 * @param dateStr - YYYY-MM-DD 形式
 * @returns 例: "2025年03月"
 */
export function formatMonthJp(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  return `${y}年${pad(m)}月`;
}

/**
 * YYYY-MM-DD から年を抜き yyyy年 にフォーマットする。
 * @param dateStr - YYYY-MM-DD 形式
 * @returns 例: "2025年"
 */
export function formatYearJp(dateStr: string): string {
  const y = dateStr.slice(0, 4);
  return `${y}年`;
}

/**
 * YYYY-MM-DD を MM月dd日 にフォーマットする（年なし。週次リストの年グループ内表示用）。
 * @param dateStr - YYYY-MM-DD 形式
 * @returns 例: "03月01日"
 */
export function formatMonthDayJp(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${pad(m)}月${pad(d)}日`;
}

/**
 * YYYY-MM-DD を MM月 にフォーマットする（年・日なし。月次リストの年グループ内表示用）。
 * @param dateStr - YYYY-MM-DD 形式
 * @returns 例: "03月"
 */
export function formatMonthOnlyJp(dateStr: string): string {
  const [, m] = dateStr.split("-").map(Number);
  return `${pad(m)}月`;
}

/**
 * レポート期間の表示ラベルを返す。
 * 週次: yyyy年MM月dd日～yyyy年MM月dd日、月次: yyyy年MM月、年次: yyyy年
 * @param item - type と period.from / period.to を持つオブジェクト
 */
export function getPeriodLabel(item: {
  type: string;
  period: { from: string; to: string };
}): string {
  const { from, to } = item.period;
  if (item.type === "weekly") {
    return `${formatDateJp(from)}～${formatDateJp(to)}`;
  }
  if (item.type === "monthly") {
    return formatMonthJp(from);
  }
  return formatYearJp(to);
}
