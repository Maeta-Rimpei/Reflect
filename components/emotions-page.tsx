"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getApiHeaders } from "@/lib/api-auth";
import { getLast7DaysDateStringsInTokyo, getLast7DaysRangeInTokyo } from "@/lib/date-utils";
import type { EmotionRow } from "@/types/entry";
import type { EmotionsInitialData } from "@/types/emotions";

/** 気分値 → バーの高さ％（良いほど高い） */
const moodLevel: Record<string, number> = {
  great: 85,
  good: 65,
  neutral: 50,
  low: 25,
  bad: 10,
};

/** 気分値 → バー/ドットの Tailwind クラス */
const moodColor: Record<string, string> = {
  great: "bg-foreground/70",
  good: "bg-foreground/50",
  neutral: "bg-foreground/30",
  low: "bg-foreground/20",
  bad: "bg-foreground/10",
};

/** 直近7日の感情ログとタグ頻度を表示するページ */
export function EmotionsPage({
  initialData,
}: {
  /** サーバーで取得・集計した初回データ。ある場合はクライアントの初回 fetch をスキップする */
  initialData?: EmotionsInitialData | null;
}) {
  /** 直近7日分の感情ログ（日付・気分・感情の文章） */
  const [emotionLog, setEmotionLog] = useState<EmotionRow[]>(
    initialData?.emotionLog ?? [],
  );
  /** 初回取得中か（initialData がある場合はサーバーで済んでいるので false） */
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) return;
    let cancelled = false;

    async function fetchData() {
      const headers = await getApiHeaders();
      const { from, to } = getLast7DaysRangeInTokyo();

      const res = await fetch(`/api/v1/emotions?from=${from}&to=${to}`, {
        headers,
        credentials: "include",
      });

      if (cancelled) return;

      if (res.ok) {
        const data = (await res.json()) as EmotionRow[];
        setEmotionLog(Array.isArray(data) ? data : []);
      } else {
        setEmotionLog([]);
      }
      setLoading(false);
    }

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [initialData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
          感情ログ
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          感情の記録
        </h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
          気分の推移（直近7日）
        </h2>
        <p className="text-[10px] text-muted-foreground mb-4">
          毎日選んだ「いまの気分」をバーの高さで表示しています。高いほど良い気分です。
        </p>
        <div className="flex items-start gap-2">
          {/* Y軸ラベル（バー領域 h-20 に対応、下の曜日行分の余白を確保） */}
          <div className="flex flex-col justify-between h-20 text-[9px] text-muted-foreground pr-1 shrink-0 mb-5">
            <span>良い</span>
            <span>ふつう</span>
            <span>つらい</span>
          </div>
          <div className="flex items-end gap-2 flex-1">
            {(() => {
              const moodLabel: Record<string, string> = {
                great: "とても良い", good: "良い", neutral: "ふつう", low: "少し落ち込み", bad: "かなりつらい",
              };
              const logMap = new Map(emotionLog.map((e) => [e.date, e]));
              const dateStrings = getLast7DaysDateStringsInTokyo();
              const days: { date: string; weekday: string }[] = dateStrings.map((date) => ({
                date,
                weekday: new Date(date).toLocaleDateString("ja-JP", {
                  weekday: "short",
                  timeZone: "Asia/Tokyo",
                }),
              }));
              return days.map(({ date, weekday }) => {
                const entry = logMap.get(date);
                const pct = entry?.mood ? (moodLevel[entry.mood] ?? 50) : 0;
                const [, m, day] = date.split("-").map(Number);
                const dateLabel = `${m}/${day}`;
                return (
                  <div
                    key={date}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div className="w-full flex items-end justify-center h-20">
                      {pct > 0 ? (
                        <div
                          className={cn(
                            "w-full max-w-[32px] rounded-t-md transition-all",
                            moodColor[entry?.mood ?? ""] ?? "bg-foreground/30"
                          )}
                          style={{ height: `${pct}%` }}
                          title={entry?.mood ? moodLabel[entry.mood] ?? "" : ""}
                        />
                      ) : (
                        <div className="w-full max-w-[32px] h-[2px] rounded bg-border" title="記録なし" />
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-0 leading-tight">
                      <span className="text-[9px] font-medium text-foreground">
                        {dateLabel}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {weekday}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
          直近7日の感情
        </h2>
        <p className="text-[10px] text-muted-foreground mb-4">
          過去に選択した「いまの気分」と、その日の感情分析結果です。
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground/70" /> とても良い
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground/50" /> 良い
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground/30" /> ふつう
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground/20" /> 少し落ち込み
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground/10" /> かなりつらい
          </span>
        </div>
        <div className="space-y-0">
          {emotionLog.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">データがありません</p>
          ) : (
            emotionLog.map((entry, i) => (
              <div
                key={entry.date}
                className={cn(
                  "flex items-start gap-4 py-4",
                  i !== emotionLog.length - 1 && "border-b border-border"
                )}
              >
                <div className="w-14 shrink-0 flex flex-col gap-0.5">
                  <p className="text-xs font-semibold text-foreground tabular-nums">
                    {new Date(entry.date).toLocaleDateString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      timeZone: "Asia/Tokyo",
                    })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(entry.date).toLocaleDateString("ja-JP", {
                      weekday: "short",
                      timeZone: "Asia/Tokyo",
                    })}
                  </p>
                  {entry.mood && (
                    <div
                      className={cn(
                        "h-2.5 w-2.5 rounded-full shrink-0 mt-1",
                        moodColor[entry.mood] ?? "bg-foreground/30"
                      )}
                      title={entry.mood}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {entry.tags.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">感情の記述なし</p>
                  ) : (
                    <div className="space-y-2">
                      {entry.tags.map((text, j) => (
                        <p
                          key={j}
                          className="text-sm text-foreground leading-relaxed"
                        >
                          {text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
