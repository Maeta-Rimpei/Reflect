"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  Laugh,
  Smile,
  Meh,
  Frown,
  HeartCrack,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiHeaders } from "@/lib/api-auth";
import {
  getTodayPartsInTokyo,
  isYmdInCurrentWeekTokyo,
  toYmdInTokyo,
} from "@/lib/date-utils";
import type { EntryItem, EmotionRow, HistoryInitialData } from "@/types/entry";
import { MAX_JOURNAL_BODY_LENGTH_FREE } from "@/constants/limits";
import { PLAN_DEEP, PLAN_FREE } from "@/constants/plan";
import type { Plan } from "@/types/plan";

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
  const [plan, setPlan] = useState<Plan>(initialData?.plan ?? PLAN_FREE);
  const [journalRegenerationBRemaining, setJournalRegenerationBRemaining] = useState(
    initialData?.journalRegenerationBRemaining ?? 0,
  );
  const [journalRegenerationBLimit, setJournalRegenerationBLimit] = useState(
    initialData?.journalRegenerationBLimit ?? 3,
  );

  /** 編集モーダル */
  const [editOpen, setEditOpen] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [editMood, setEditMood] = useState<string | null>(null);
  /** 保存処理中の種別（押したボタンだけ「中…」表示にする） */
  const [editSubmitMode, setEditSubmitMode] = useState<
    "idle" | "save" | "saveAndReanalyze"
  >("idle");
  /** 再分析: 確認 / 不可の説明（編集ダイアログより前面） */
  const [reanalyzeModal, setReanalyzeModal] = useState<
    "closed" | "confirm" | "blocked"
  >("closed");
  const [editError, setEditError] = useState<string | null>(null);
  const [genMessage, setGenMessage] = useState<string | null>(null);

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
      setPlan(initialData.plan ?? PLAN_FREE);
      setJournalRegenerationBRemaining(initialData.journalRegenerationBRemaining ?? 0);
      setJournalRegenerationBLimit(initialData.journalRegenerationBLimit ?? 3);
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
        setPlan(data.plan ?? PLAN_FREE);
        setJournalRegenerationBRemaining(data.journalRegenerationBRemaining ?? 0);
        setJournalRegenerationBLimit(data.journalRegenerationBLimit ?? 3);
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
  const selectedEntry = selectedPostedAt
    ? entries.find((e) => toYmdInTokyo(e.postedAt) === selectedPostedAt)
    : null;
  /** 選択日の感情テキスト（AI 分析の主・補など、文章で返る） */
  const selectedEmotions = selectedPostedAt
    ? emotions.find((e) => toYmdInTokyo(e.date) === selectedPostedAt)?.tags ?? []
    : [];

  /**
   * 表示月を1つ前にする（選択状態もリセット）
   * @returns 月表示
   */
  const goPrevMonth = () => {
    setSelectedDate(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  /**
   * 表示月を1つ後にする（選択状態もリセット）
   * @returns 月表示
   */
  const goNextMonth = () => {
    setSelectedDate(null);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  /**
   * ヘッダーに表示する「Y年M月」（東京タイムゾーンで表示）
   * @returns 月表示
   */
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("ja-JP", {
    month: "numeric",
    year: "numeric",
    timeZone: "Asia/Tokyo",
  });

  /**
   * 指定日付の気分を取得（emotions 優先、なければ selectedEntry の mood）
   * @param dateStr 日付（YYYY-MM-DD）
   * @returns 気分
   */
  const moodForDate = (dateStr: string) =>
    emotions.find((e) => toYmdInTokyo(e.date) === dateStr)?.mood ??
    selectedEntry?.mood ??
    null;

  const selectedYmd = selectedEntry ? toYmdInTokyo(selectedEntry.postedAt) : "";
  const inThisWeek = selectedYmd ? isYmdInCurrentWeekTokyo(selectedYmd) : false;
  const showDailyRegenA =
    Boolean(selectedEntry) && inThisWeek && selectedEntry && !selectedEntry.hasDailyAnalysis;
  const showDailyRegenB =
    Boolean(selectedEntry) &&
    inThisWeek &&
    selectedEntry &&
    selectedEntry.hasDailyAnalysis &&
    plan === PLAN_DEEP &&
    journalRegenerationBRemaining > 0;

  /** 今週かつ、種類 A（未取得）または種類 B（Deep・枠あり）で再分析可能 */
  const canSaveAndReanalyze = showDailyRegenA || showDailyRegenB;

  const saveAndReanalyzeDisabledReason = selectedEntry
    ? !inThisWeek
      ? "今週（月曜始まり）のふりかえりのみ再分析できます。"
      : selectedEntry.hasDailyAnalysis && plan === PLAN_FREE
        ? "分析のやり直しには Deep プランが必要です。"
        : selectedEntry.hasDailyAnalysis &&
            plan === PLAN_DEEP &&
            journalRegenerationBRemaining === 0
          ? "今月の再分析の上限に達しています。"
          : null
    : null;

  const openEditModal = () => {
    if (!selectedEntry) return;
    setEditBody(selectedEntry.body);
    setEditMood(selectedEntry.mood);
    setEditError(null);
    setGenMessage(null);
    setReanalyzeModal("closed");
    setEditOpen(true);
  };

  /** 再分析が不可なときの説明（回数上限時も同じトーン） */
  const reanalyzeBlockedContent = selectedEntry
    ? !inThisWeek
      ? {
          title: "再分析できません",
          lines: [
            "一度の振り返りとしっかり向き合うため、再分析は今週の記録に限ります。",
            "今週（月曜始まり）のふりかえりのみ、再分析を実行できます。",
          ],
        }
      : selectedEntry.hasDailyAnalysis && plan === PLAN_FREE
        ? {
            title: "再分析できません",
            lines: [
              "一度の振り返りとしっかり向き合うため、回数に制限があります（Deep プラン向け）。",
              "分析のやり直しには Deep プランが必要です。",
            ],
          }
        : selectedEntry.hasDailyAnalysis &&
            plan === PLAN_DEEP &&
            journalRegenerationBRemaining === 0
          ? {
              title: "再分析できません",
              lines: [
                "一度の振り返りとしっかり向き合うため、回数に制限があります。",
                `今月の再分析は上限（${journalRegenerationBLimit} 回）に達しました。今月はこれ以上実行できません。`,
              ],
            }
          : {
              title: "再分析できません",
              lines: [saveAndReanalyzeDisabledReason ?? "再分析できません。"],
            }
    : null;

  const onClickReanalyzeInEdit = () => {
    if (!editMood?.trim()) return;
    if (!canSaveAndReanalyze) {
      setReanalyzeModal("blocked");
      return;
    }
    setReanalyzeModal("confirm");
  };

  /**
   * 日次分析 API を実行（保存後に続けて呼ぶ想定）
   */
  const runDailyRegenerateAfterSave = async (entryId: string, ymd: string) => {
    const headers = await getApiHeaders();
    const res = await fetch("/api/v1/analysis/generate", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type: "daily", entryId }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      payload?: {
        summary?: string;
        primaryEmotion?: string;
        secondaryEmotion?: string;
        thoughtPatterns?: string[];
        tension?: string;
        metaInsight?: string;
        question?: string;
      };
      regenerationBRemaining?: number;
    };
    if (!res.ok) {
      throw new Error(data.message ?? "分析に失敗しました。");
    }
    const p = data.payload;
    const tags = [p?.primaryEmotion, p?.secondaryEmotion].filter(
      (t): t is string => Boolean(t && String(t).trim()),
    );
    const nextAnalysis = p
      ? {
          summary: p.summary ?? "",
          primaryEmotion: p.primaryEmotion ?? "",
          secondaryEmotion: p.secondaryEmotion ?? "",
          thoughtPatterns: p.thoughtPatterns ?? [],
          tension: p.tension ?? "",
          metaInsight: p.metaInsight ?? "",
          question: p.question ?? "",
        }
      : null;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, hasDailyAnalysis: true, dailyAnalysis: nextAnalysis }
          : e,
      ),
    );
    setEmotions((prev) =>
      prev.map((em) =>
        toYmdInTokyo(em.date) === ymd ? { ...em, tags } : em,
      ),
    );
    if (typeof data.regenerationBRemaining === "number") {
      setJournalRegenerationBRemaining(data.regenerationBRemaining);
    }
  };

  /**
   * @param withReanalyze - true のとき保存成功後に日次分析を実行
   */
  const saveEdit = async (withReanalyze: boolean) => {
    if (!selectedEntry || !editMood?.trim()) {
      setEditError("気分を選んでください。");
      return;
    }
    if (withReanalyze && !canSaveAndReanalyze) {
      setEditError(saveAndReanalyzeDisabledReason ?? "再分析できません。");
      return;
    }
    let body = editBody.trim();
    if (plan === PLAN_FREE && body.length > MAX_JOURNAL_BODY_LENGTH_FREE) {
      setEditError(`本文は ${MAX_JOURNAL_BODY_LENGTH_FREE} 文字以内にしてください。`);
      return;
    }
    setEditSubmitMode(withReanalyze ? "saveAndReanalyze" : "save");
    setEditError(null);
    setGenMessage(null);
    if (withReanalyze) setReanalyzeModal("closed");
    const entryId = selectedEntry.id;
    const ymd = selectedYmd;
    try {
      const headers = await getApiHeaders();
      const res = await fetch(`/api/v1/entries/${entryId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body, mood: editMood.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        body?: string;
        mood?: string | null;
      };
      if (!res.ok) {
        setEditError(data.message ?? "保存に失敗しました。");
        return;
      }
      const nextBody = typeof data.body === "string" ? data.body : body;
      const nextMood = data.mood !== undefined ? data.mood : editMood.trim();
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? {
                ...e,
                body: nextBody,
                mood: nextMood,
                wordCount: nextBody.length,
              }
            : e,
        ),
      );
      setEmotions((prev) =>
        prev.map((em) =>
          toYmdInTokyo(em.date) === ymd ? { ...em, mood: nextMood } : em,
        ),
      );

      if (withReanalyze) {
        try {
          await runDailyRegenerateAfterSave(entryId, ymd);
        } catch (e) {
          setGenMessage(e instanceof Error ? e.message : "分析に失敗しました。");
          setEditOpen(false);
          return;
        }
      }
      setEditOpen(false);
    } catch {
      setEditError("保存に失敗しました。");
    } finally {
      setEditSubmitMode("idle");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
        <div
          className="flex flex-col items-center justify-center gap-3 py-12 text-center"
          role="status"
          aria-live="polite"
          aria-label="履歴を読み込み中"
        >
          <Loader2 className="h-9 w-9 animate-spin text-foreground/70" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">読み込み中です</p>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              ふりかえりの情報を取得しています。しばらくお待ちください。
            </p>
          </div>
        </div>
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
            const entry = entries.find((e) => toYmdInTokyo(e.postedAt) === dateStr);
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

          {selectedEntry.mood && (() => {
            const opt = MOOD_OPTIONS.find((m) => m.value === selectedEntry.mood);
            if (!opt) return null;
            const Icon = opt.Icon;
            return (
              <div className="mb-5">
                <p className="text-[10px] underline font-medium tracking-widest mb-2">
                  気分
                </p>
                <div className="flex items-center gap-2 pl-2">
                  <Icon className="h-4 w-4 text-foreground" />
                  <span className="text-xs font-medium text-foreground">{opt.label}</span>
                </div>
              </div>
            );
          })()}

          <p className="text-[10px] underline font-medium tracking-widest">
            ふりかえり
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mt-2 pl-2">
            {selectedEntry.body}
          </p>

          {selectedEntry.dailyAnalysis && (
            <div className="mt-6 space-y-4">
              <p className="text-[10px] underline font-medium tracking-widest">
                分析結果
              </p>

              {selectedEmotions.length > 0 && (
                <div className="pl-2">
                  <p className="text-[10px] font-medium tracking-widest text-muted-foreground mb-1">感情</p>
                  {selectedEmotions.map((text, i) => (
                    <div
                      key={i}
                      className="rounded-bl-xl border-l-3 border-b-2 border-foreground/20 py-2 px-4 mt-1"
                    >
                      <p className="text-sm text-foreground leading-relaxed">{text}</p>
                    </div>
                  ))}
                </div>
              )}

              {Array.isArray(selectedEntry.dailyAnalysis.thoughtPatterns) &&
                selectedEntry.dailyAnalysis.thoughtPatterns.length > 0 && (
                <div className="pl-2">
                  <p className="text-[10px] font-medium tracking-widest text-muted-foreground mb-1">思考傾向</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
                    {selectedEntry.dailyAnalysis.thoughtPatterns.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedEntry.dailyAnalysis.tension && (
                <div className="pl-2">
                  <p className="text-[10px] font-medium tracking-widest text-muted-foreground mb-1">緊張・葛藤</p>
                  <p className="text-sm text-foreground leading-relaxed">{selectedEntry.dailyAnalysis.tension}</p>
                </div>
              )}

              {selectedEntry.dailyAnalysis.metaInsight && (
                <div className="pl-2">
                  <p className="text-[10px] font-medium tracking-widest text-muted-foreground mb-1">メタな気づき</p>
                  <p className="text-sm text-foreground leading-relaxed italic">{selectedEntry.dailyAnalysis.metaInsight}</p>
                </div>
              )}

              {selectedEntry.dailyAnalysis.question && (
                <div className="pl-2 border-t border-border pt-3">
                  <p className="text-[10px] font-medium tracking-widest text-muted-foreground mb-1">問い</p>
                  <p className="text-sm text-foreground leading-relaxed">「{selectedEntry.dailyAnalysis.question}」</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openEditModal}
              className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              編集
            </button>
          </div>

          {genMessage && (
            <p className="mt-2 text-xs text-red-600">{genMessage}</p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            日付を選ぶと、その日のふりかえりが表示されます。
          </p>
        </div>
      )}

      {editOpen && selectedEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-edit-title"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-white shadow-lg dark:bg-zinc-950">
            <div className="max-h-[90vh] overflow-y-auto overflow-x-hidden p-6">
            <h2 id="history-edit-title" className="text-sm font-semibold text-foreground mb-4">
              ふりかえりを編集
            </h2>
            <label className="block text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
              気分
            </label>
            <div className="flex flex-wrap gap-2 mb-5">
              {MOOD_OPTIONS.map((m) => {
                const Icon = m.Icon;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setEditMood(m.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border px-3 py-2 text-[10px]",
                      editMood === m.value
                        ? "border-foreground/40 bg-foreground/10"
                        : "border-border bg-secondary/30",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>
            <label className="block text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
              本文
            </label>
            <div className="rounded-lg border border-border bg-background overflow-hidden mb-2">
              <textarea
                value={editBody}
                onChange={(e) =>
                  setEditBody(
                    plan === PLAN_FREE
                      ? e.target.value.slice(0, MAX_JOURNAL_BODY_LENGTH_FREE)
                      : e.target.value,
                  )
                }
                className="w-full min-h-[260px] resize-none border-0 bg-transparent p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0"
              />
            </div>
            {plan === PLAN_FREE && (
              <p className="text-[10px] text-muted-foreground mb-4 text-right">
                {editBody.length}/{MAX_JOURNAL_BODY_LENGTH_FREE}
              </p>
            )}

            <p className="text-xs font-medium text-foreground">
              今月の再分析の残り:{" "}
              <span className="tabular-nums">
                {journalRegenerationBRemaining} / {journalRegenerationBLimit} 回
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 mb-4 leading-relaxed">
              分析が失敗した際の分析再試行は、上記の回数には含まれません。
            </p>

            {editError && <p className="text-xs text-red-600 mb-3">{editError}</p>}
            {genMessage && <p className="text-xs text-red-600 mb-3">{genMessage}</p>}

            <div className="flex flex-col-reverse gap-2 mt-4 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                disabled={editSubmitMode !== "idle"}
                onClick={() => {
                  setReanalyzeModal("closed");
                  setEditOpen(false);
                }}
                className="rounded-lg border border-border bg-transparent px-4 py-2.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={editSubmitMode !== "idle" || !editMood}
                onClick={() => void saveEdit(false)}
                className="rounded-lg border border-foreground/25 bg-foreground/5 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-foreground/10 disabled:opacity-50 cursor-pointer"
              >
                {editSubmitMode === "save" ? "保存中…" : "保存のみ"}
              </button>
              <button
                type="button"
                disabled={editSubmitMode !== "idle" || !editMood}
                title={
                  !canSaveAndReanalyze && editMood
                    ? saveAndReanalyzeDisabledReason ?? undefined
                    : undefined
                }
                onClick={onClickReanalyzeInEdit}
                className="rounded-lg bg-foreground px-4 py-2.5 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-50 cursor-pointer"
              >
                {editSubmitMode === "saveAndReanalyze"
                  ? "処理中…"
                  : "保存して再分析する"}
              </button>
            </div>
            {editSubmitMode === "saveAndReanalyze" ? (
              <p
                className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-foreground/90 leading-relaxed"
                role="status"
                aria-live="polite"
              >
                保存後、再分析が始まります。完了まで数十秒〜1分ほどかかることがあります。この画面のままお待ちください。
              </p>
            ) : null}
            </div>
          </div>
        </div>
      )}

      {reanalyzeModal === "confirm" && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reanalyze-confirm-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-white shadow-lg dark:bg-zinc-950">
            <div className="p-6">
              <h3
                id="reanalyze-confirm-title"
                className="text-sm font-semibold text-foreground mb-3"
              >
                保存して再分析する
              </h3>
              <div className="text-sm text-foreground leading-relaxed space-y-3">
                {showDailyRegenB ? (
                  <>
                    <p>
                      一度のふりかえりとしっかり向き合うため、再分析回数に制限があります。
                    </p>
                    <p>
                      今月残り {journalRegenerationBRemaining} 回です。
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      一度のふりかえりとしっかり向き合うため、分析には時間がかかります。
                    </p>
                    <p className="text-xs text-muted-foreground">
                      参考: 今月の再分析の残り{" "}
                      <span className="tabular-nums">
                        {journalRegenerationBRemaining} / {journalRegenerationBLimit}
                      </span>{" "}
                      回
                    </p>
                  </>
                )}
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setReanalyzeModal("closed")}
                  className="rounded-lg border border-border bg-transparent px-4 py-2.5 text-xs font-medium text-foreground hover:bg-accent cursor-pointer"
                >
                  戻る
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReanalyzeModal("closed");
                    void saveEdit(true);
                  }}
                  className="rounded-lg bg-foreground px-4 py-2.5 text-xs font-medium text-background hover:bg-foreground/90 cursor-pointer"
                >
                  保存して再分析する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reanalyzeModal === "blocked" && reanalyzeBlockedContent && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reanalyze-blocked-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-white shadow-lg dark:bg-zinc-950">
            <div className="p-6">
              <h3
                id="reanalyze-blocked-title"
                className="text-sm font-semibold text-foreground mb-3"
              >
                {reanalyzeBlockedContent.title}
              </h3>
              <div className="text-sm text-foreground leading-relaxed space-y-3">
                {reanalyzeBlockedContent.lines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setReanalyzeModal("closed")}
                  className="rounded-lg bg-foreground px-4 py-2.5 text-xs font-medium text-background hover:bg-foreground/90 cursor-pointer"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
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
