/**
 * 履歴ページの初回表示用データをサーバー側で取得する。
 * 今月分を要求し、403（Free プラン制限）の場合は直近7日で再取得する。
 */
import { getLast7DaysRangeInTokyo, getTodayPartsInTokyo } from "@/lib/date-utils";
import type { EntryItem, EmotionRow, HistoryInitialData } from "@/types/entry";

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toYYYYMMDD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getViewPrefix(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-`;
}

function parseEntryDatesFromCalendar(
  calendarDates: string[] | undefined,
  viewYear: number,
  viewMonth: number,
): number[] {
  const prefix = getViewPrefix(viewYear, viewMonth);
  const dates = new Set<number>();
  for (const d of calendarDates ?? []) {
    const dateStr = String(d);
    if (!dateStr.startsWith(prefix)) continue;
    const day = parseInt(dateStr.slice(8, 10), 10);
    if (!Number.isNaN(day)) dates.add(day);
  }
  return [...dates];
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

/** 履歴範囲取得のパラメータ（API と初回取得で共通） */
export interface FetchHistoryRangeParams {
  from: string;
  to: string;
  viewMonth: number;
  viewYear: number;
}

/**
 * 指定範囲の履歴データを取得。403 時は直近7日にフォールバックする。
 * サーバー（初回表示）と GET /api/v1/history の両方で利用。
 */
export async function fetchHistoryRangeData(
  baseUrl: string,
  cookieHeader: string,
  params: FetchHistoryRangeParams,
): Promise<Omit<HistoryInitialData, "viewMonth" | "viewYear"> & { viewMonth: number; viewYear: number }> {
  const { from: fromParam, to: toParam, viewMonth, viewYear } = params;
  const headers = { Cookie: cookieHeader };

  const [entriesRes, calendarRes, emotionsRes] = await Promise.all([
    fetch(`${baseUrl}/api/v1/entries?from=${fromParam}&to=${toParam}`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/v1/calendar?from=${fromParam}&to=${toParam}`, {
      headers,
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/v1/emotions?from=${fromParam}&to=${toParam}`, {
      headers,
      cache: "no-store",
    }),
  ]);

  const isPlanLimit = entriesRes.status === 403 || calendarRes.status === 403;

  if (isPlanLimit) {
    const { from: from7, to: to7 } = getLast7DaysRangeInTokyo();
    const [e7, c7, em7] = await Promise.all([
      fetch(`${baseUrl}/api/v1/entries?from=${from7}&to=${to7}`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${baseUrl}/api/v1/calendar?from=${from7}&to=${to7}`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${baseUrl}/api/v1/emotions?from=${from7}&to=${to7}`, {
        headers,
        cache: "no-store",
      }),
    ]);
    const calendarJson = c7.ok ? await c7.json() : { dates: [] };
    const entries = ensureArray<EntryItem>(e7.ok ? await e7.json() : []);
    const emotions = ensureArray<EmotionRow>(em7.ok ? await em7.json() : []);
    const entryDates = parseEntryDatesFromCalendar(
      (calendarJson as { dates?: string[] }).dates,
      viewYear,
      viewMonth,
    );
    return {
      entries,
      emotions,
      entryDates,
      isFreeLimit: true,
      viewMonth,
      viewYear,
    };
  }

  if (entriesRes.ok && calendarRes.ok) {
    const [entriesJson, calendarJson] = await Promise.all([
      entriesRes.json(),
      calendarRes.json(),
    ]);
    const emotionsJson = emotionsRes.ok ? await emotionsRes.json() : [];
    const entryDates = parseEntryDatesFromCalendar(
      (calendarJson as { dates?: string[] }).dates,
      viewYear,
      viewMonth,
    );
    return {
      entries: ensureArray<EntryItem>(entriesJson),
      emotions: ensureArray<EmotionRow>(emotionsJson),
      entryDates,
      isFreeLimit: false,
      viewMonth,
      viewYear,
    };
  }

  return {
    entries: [],
    emotions: [],
    entryDates: [],
    isFreeLimit: false,
    viewMonth,
    viewYear,
  };
}

/**
 * 履歴ページ用の初期データを取得。今月を要求し、403 時は直近7日にフォールバックする。
 */
export async function fetchHistoryInitialData(
  baseUrl: string,
  cookieHeader: string,
): Promise<HistoryInitialData> {
  const { year: viewYear, month: viewMonth } = getTodayPartsInTokyo();
  const fromParam = toYYYYMMDD(viewYear, viewMonth, 1);
  const lastDay = getDaysInMonth(viewMonth, viewYear);
  const toParam = toYYYYMMDD(viewYear, viewMonth, lastDay);
  return fetchHistoryRangeData(baseUrl, cookieHeader, {
    from: fromParam,
    to: toParam,
    viewMonth,
    viewYear,
  });
}
