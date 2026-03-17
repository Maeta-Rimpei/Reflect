"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Lock, Laugh, Smile, Meh, Frown, HeartCrack } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiHeaders } from "@/lib/api-auth";
import { getTodayPartsInTokyo } from "@/lib/date-utils";
import type { EntryItem, EmotionRow, HistoryInitialData } from "@/types/entry";

/** 曜日ラベル（日〜土） */
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** 気分選択肢（journal-page と同一。value / 表示ラベル / アイコン） */
const MOOD_OPTIONS = [
  { value: "great", label: "とても良い", Icon: Laugh },
  { value: "good", label: "良い", Icon: Smile },
  { value: "neutral", label: "ふつう", Icon: Meh },
  { value: "low", label: "少し落ち込み", Icon: Frown },
  { value: "bad", label: "かなりつらい", Icon: HeartCrack },
] as const;

/** 気分値 → カレンダー日セル内ドットの Tailwind クラス */
const MOOD_COLOR: Record<string, string> = {
  great: "bg-foreground/70",
  good: "bg-foreground/50",
  neutral: "bg-foreground/30",
  low: "bg-foreground/20",
  bad: "bg-foreground/10",
};

/** 指定年月の日数を返す（0-indexed month） */
function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** 指定年月の1日の曜日（0=日〜6=土）を返す */
function getFirstDayOfMonth(month: number, year: number) {
  return new Date(year, month, 1).getDay();
}

/** 年月日を YYYY-MM-DD 形式にする（month は 0-indexed） */
function toYYYYMMDD(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** カレンダーで月を切り替え、日付を選ぶとその日のふりかえりを表示するページ */
export function HistoryPage({
  initialData,
}: {
  /** サーバーで取得した初回データ。ある場合は表示月が一致する間はクライアント fetch をスキップする */
  initialData?: HistoryInitialData | null;
}) {
  /** カレンダーで選択した「日」（1〜31）。null は未選択 */
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  /** 東京タイムゾーンでの「今日」（カレンダー今日ハイライト・初期表示月用） */
  const todayParts = getTodayPartsInTokyo();
  /** 表示中の月（0〜11） */
  const [viewMonth, setViewMonth] = useState(initialData?.viewMonth ?? todayParts.month);
  /** 表示中の年 */
  const [viewYear, setViewYear] = useState(initialData?.viewYear ?? todayParts.year);
  /** 表示月のエントリ一覧（postedAt / body / mood など） */
  const [entries, setEntries] = useState<EntryItem[]>(initialData?.entries ?? []);
  /** 表示月の感情ログ（日付ごとの mood / tags） */
  const [emotions, setEmotions] = useState<EmotionRow[]>(initialData?.emotions ?? []);
  /** 表示月中でエントリがある「日」の Set（カレンダーに✓を付けるため） */
  const [entryDates, setEntryDates] = useState<Set<number>>(
    () => new Set(initialData?.entryDates ?? []),
  );
  /** 初回取得中か（initialData がある場合はサーバーで済んでいるので false） */
  const [loading, setLoading] = useState(!initialData);
  /** Free プランで 7 日制限がかかっているか（true のとき直近7日のみ表示） */
  const [isFreeLimit, setIsFreeLimit] = useState(initialData?.isFreeLimit ?? false);

  /** API の from パラメータ（表示月の1日） */
  const fromParam = toYYYYMMDD(viewYear, viewMonth, 1);
  const lastDay = getDaysInMonth(viewMonth, viewYear);
  /** API の to パラメータ（表示月の末日） */
  const toParam = toYYYYMMDD(viewYear, viewMonth, lastDay);

  useEffect(() => {
    if (
      initialData &&
      viewMonth === initialData.viewMonth &&
      viewYear === initialData.viewYear
    ) {
      setEntries(initialData.entries ?? []);
      setEmotions(initialData.emotions ?? []);
      setEntryDates(new Set(initialData.entryDates ?? []));
      setIsFreeLimit(initialData.isFreeLimit ?? false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getApiHeaders()
      .then((headers) =>
        fetch(
          `/api/v1/history?from=${fromParam}&to=${toParam}&viewMonth=${viewMonth}&viewYear=${viewYear}`,
          { headers, credentials: "include" },
        ),
      )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch failed"))))
      .then((data: HistoryInitialData) => {
        if (cancelled) return;
        setEntries(data.entries ?? []);
        setEmotions(data.emotions ?? []);
        setEntryDates(new Set(data.entryDates ?? []));
        setIsFreeLimit(data.isFreeLimit ?? false);
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([]);
          setEmotions([]);
          setEntryDates(new Set());
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialData, fromParam, toParam, viewMonth, viewYear]);

  /** 表示月の日数（カレンダーグリッド用） */
  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  /** 1日の曜日（先頭の空白セル数） */
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear);

  /** 選択日の YYYY-MM-DD（null は未選択） */
  const selectedPostedAt =
    selectedDate != null ? toYYYYMMDD(viewYear, viewMonth, selectedDate) : null;
  /** 選択日に対応するエントリ（本文・気分表示用） */
  const selectedEntry = selectedPostedAt ? entries.find((e) => e.postedAt === selectedPostedAt) : null;
  /** 選択日の感情テキスト（AI 分析の主・補など、文章で返る） */
  const selectedEmotions = selectedPostedAt
    ? emotions.find((e) => e.date === selectedPostedAt)?.tags ?? []
    : [];

  /** 表示月を1つ前にする（選択状態もリセット） */
  const goPrevMonth = () => {
    setSelectedDate(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  /** 表示月を1つ後にする（選択状態もリセット） */
  const goNextMonth = () => {
    setSelectedDate(null);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  /** ヘッダーに表示する「Y年M月」（東京タイムゾーンで表示） */
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("ja-JP", {
    month: "numeric",
    year: "numeric",
    timeZone: "Asia/Tokyo",
  });

  /** 指定日付の気分を取得（emotions 優先、なければ selectedEntry の mood） */
  const moodForDate = (dateStr: string) =>
    emotions.find((e) => e.date === dateStr)?.mood ?? selectedEntry?.mood ?? null;

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
          ふりかえり
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">履歴</h1>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={goPrevMonth}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="前の月へ"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-foreground">{monthLabel}</h2>
          <button
            type="button"
            onClick={goNextMonth}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="次の月へ"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAY_LABELS.map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-medium text-muted-foreground py-1"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = toYYYYMMDD(viewYear, viewMonth, day);
            const hasEntry = entryDates.has(day);
            const isToday =
              day === todayParts.day &&
              viewMonth === todayParts.month &&
              viewYear === todayParts.year;
            const isSelected = day === selectedDate;
            const entry = entries.find((e) => e.postedAt === dateStr);
            const mood = entry?.mood ?? moodForDate(dateStr);

            return (
              <button
                key={day}
                type="button"
                onClick={() => hasEntry && setSelectedDate(day)}
                className={cn(
                  "aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative",
                  isSelected && "bg-foreground/15 text-foreground font-semibold",
                  !isSelected && isToday && "border border-foreground text-foreground",
                  !isSelected && !isToday && hasEntry && "hover:bg-accent text-foreground cursor-pointer",
                  !isSelected && !isToday && !hasEntry && "text-muted-foreground/40 cursor-default"
                )}
                disabled={!hasEntry}
              >
                <span className="font-medium">{day}</span>
                {hasEntry && !isSelected && mood && (
                  <div
                    className={cn(
                      "absolute bottom-1 h-2 w-2 rounded-full",
                      MOOD_COLOR[mood] ?? "bg-foreground/30"
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {selectedEntry ? (
        <div className="rounded-xl border border-border bg-card p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-4">
            <p className="text-xs text-muted-foreground">
              {new Date(selectedEntry.postedAt).toLocaleDateString("ja-JP", {
                month: "numeric",
                day: "numeric",
                weekday: "short",
                timeZone: "Asia/Tokyo",
              })}
            </p>
          </div>

          {selectedEmotions.length > 0 && (
            <div className="mb-5 space-y-3">
              <p className="text-[10px] underline font-medium tracking-widest">
                その日の感情
              </p>
              {selectedEntry.mood && (() => {
                const opt = MOOD_OPTIONS.find((m) => m.value === selectedEntry.mood);
                if (!opt) return null;
                const Icon = opt.Icon;
                return (
                  <div className="pl-2">
                    <p className="text-[10px] font-medium tracking-widest mb-2">
                      選択した気分
                    </p>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-foreground" />
                      <span className="text-xs font-medium text-foreground">{opt.label}</span>
                    </div>
                  </div>
                );
              })()}
              <div className="space-y-3 mt-4 pl-2">
                <p className="text-[10px] font-medium tracking-widest">
                  感情分析結果
                </p>
                {selectedEmotions.map((text, i) => (
                  <div
                    key={i}
                    className="rounded-bl-xl border-l-3 border-b-2 border-foreground/20 py-2.5 px-4"
                  >
                    <p className="text-sm text-foreground leading-relaxed">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] underline font-medium tracking-widest mt-8">
            ふりかえり
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mt-2 pl-2">
            {selectedEntry.body}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            日付を選ぶと、その日のふりかえりが表示されます。
          </p>
        </div>
      )}

      {isFreeLimit && (
        <div className="mt-6 rounded-xl border border-dashed border-foreground/15 bg-secondary/30 p-5 flex items-center gap-4">
          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground">
              直近7日分のみ表示しています
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Deepプランでは、すべての期間の履歴を閲覧できます。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
