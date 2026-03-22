"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { RippleMotif } from "@/components/ripple-motif";
import { getApiHeaders } from "@/lib/api-auth";
import {
  getCurrentStreak,
  getTodayInTokyo,
} from "@/lib/date-utils";
import type {
  JournalAnalysis,
  JournalInitialData,
  TodayEntry,
  WeekDayItem,
} from "@/types/journal";
import { Laugh, Smile, Meh, Frown, HeartCrack, Lightbulb } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** 気分選択肢（value / 表示ラベル / アイコン） */
const MOOD_OPTIONS = [
  { value: "great", label: "とても良い", Icon: Laugh },
  { value: "good", label: "良い", Icon: Smile },
  { value: "neutral", label: "ふつう", Icon: Meh },
  { value: "low", label: "少し落ち込み", Icon: Frown },
  { value: "bad", label: "かなりつらい", Icon: HeartCrack },
] as const;

/** 本文の最大文字数 */
const MAX_CHARS = 800;
/** 曜日ラベル（日〜土） */
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** 入力ガイド（良い例・悪い例）— docs/task.md と同期 */
const JOURNAL_INPUT_GUIDE = {

  bad: "今日は仕事で疲れた。\nなんかうまくいかなかった。\n日中食べた弁当がおいしかった。\n今日の天気は快晴でなんかよかった。",
  good:
    "[出来事1]\n上司に進捗を指摘されて焦った。\nちゃんとやっていたつもりだったので悔しかった。\n最近ミスが続いていて、自分に自信がなくなっている気がする。\n[出来事2]\n先輩にxxxの作業を褒められて嬉しかった。\nxxxの作業は何気なくやっていたが自信がついた。",
  points: [
    "1. 選択した気分に関連する出来事を書いてください。",   
    "2. その出来事に対して、どのような感情を抱いたか、またなぜその感情を抱いたかを書いてください。",
    "3. 出来事や話題が複数ある時は、出来事や話題ごとに分けて書いてみてください。",
  ],
} as const;

/**
 * API から返る生ペイロードを JournalAnalysis（generateJournalAnalysis の戻り値形）に正規化する。
 * @param p - 分析 API の payload（unknown）
 * @returns 正規化済み、または不正時は null
 */
function normalizeAnalysis(p: unknown): JournalAnalysis | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  const summary = typeof o.summary === "string" ? o.summary : "";
  const primaryEmotion = typeof o.primaryEmotion === "string" ? o.primaryEmotion : "";
  const secondaryEmotion = typeof o.secondaryEmotion === "string" ? o.secondaryEmotion : "";
  const thoughtPatterns = Array.isArray(o.thoughtPatterns)
    ? o.thoughtPatterns.map(String).filter(Boolean)
    : [];
  const tension = typeof o.tension === "string" ? o.tension : "";
  const metaInsight = typeof o.metaInsight === "string" ? o.metaInsight : "";
  const question = typeof o.question === "string" ? o.question : "";
  const hasAny =
    summary || primaryEmotion || secondaryEmotion || thoughtPatterns.length > 0 || tension || metaInsight || question;
  if (!hasAny) return null;
  return {
    summary,
    primaryEmotion,
    secondaryEmotion,
    thoughtPatterns,
    tension,
    metaInsight,
    question,
  };
}

/** 今日のふりかえり入力・保存・AI分析を表示するページコンポーネント。初回データはサーバーから渡す。 */
export function JournalPage({
  initialData,
}: {
  /** サーバーで取得した初回データ（必須）。journal ページで fetchJournalInitialData により渡される */
  initialData: JournalInitialData;
}) {
  /** テキストエリアの本文 */
  const [text, setText] = useState("");
  /** 選択中の気分（great / good / neutral / low / bad） */
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  /** 本日のふりかえりが保存済みか */
  const [isSaved, setIsSaved] = useState(Boolean(initialData.todayEntry));
  /** 保存時のAI分析リクエスト中か */
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  /** 「AI分析を再試行」実行中か */
  const [isRetrying, setIsRetrying] = useState(false);
  /** 分析エラー時のメッセージ */
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  /** 表示する日次分析結果 */
  const [analysis, setAnalysis] = useState<JournalAnalysis | null>(initialData.analysis ?? null);
  /** 記録がある日付（YYYY-MM-DD）の Set。継続日数 = getCurrentStreak(today, datesWithEntries) */
  const [datesWithEntries, setDatesWithEntries] = useState<Set<string>>(
    () => new Set(initialData.streakDates),
  );
  /** 今週の曜日ごとの記録有無・今日かどうか */
  const [weekDays, setWeekDays] = useState<WeekDayItem[]>(initialData.weekDays);
  /** 今日のエントリ（保存済みの body / mood） */
  const [todayEntry, setTodayEntry] = useState<TodayEntry | null>(initialData.todayEntry ?? null);
  /** ユーザーのプラン（free / deep）。Deep なら週次・人格分析など表示 */
  const [plan] = useState<"free" | "deep">(initialData.plan);
  /** DB に日次分析があるか（サーバー初回 + 保存・再試行で更新） */
  const [hasDailyAnalysis, setHasDailyAnalysis] = useState(initialData.hasDailyAnalysis);
  /** 種類 B（成功後の再分析）の今月残り */
  const [journalRegenerationBRemaining, setJournalRegenerationBRemaining] = useState(
    initialData.journalRegenerationBRemaining,
  );
  const journalRegenerationBLimit = initialData.journalRegenerationBLimit;
  /** 「より良い分析をするためのヒント」ダイアログの表示 */
  const [hintDialogOpen, setHintDialogOpen] = useState(false);

  const today = getTodayInTokyo();
  const streakDays = getCurrentStreak(today, datesWithEntries);

  /** 日次分析を実行する（種類 A: 未取得救済。entryId 必須） */
  const handleRetryAnalysisTypeA = async () => {
    if (!todayEntry?.id) {
      setAnalysisError("エントリー情報が取得できません。ページを再読み込みしてください。");
      return;
    }
    setIsRetrying(true);
    setAnalysisError(null);
    try {
      const headers = await getApiHeaders();
      const res = await fetch("/api/v1/analysis/generate", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "daily", entryId: todayEntry.id }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setAnalysisError((errData as { message?: string }).message ?? "分析の再試行に失敗しました。");
        return;
      }
      const data = (await res.json()) as {
        payload?: unknown;
        regenerationBRemaining?: number;
      };
      const next = normalizeAnalysis(data.payload);
      if (next) {
        setAnalysis(next);
        setHasDailyAnalysis(true);
        setAnalysisError(null);
        if (typeof data.regenerationBRemaining === "number") {
          setJournalRegenerationBRemaining(data.regenerationBRemaining);
        }
      }
    } catch {
      setAnalysisError("分析の再試行に失敗しました。");
    } finally {
      setIsRetrying(false);
    }
  };

  /** 種類 B: 成功後の再分析（Deep・同一週・月次クォータ） */
  const handleRetryAnalysisTypeB = async () => {
    if (!todayEntry?.id) return;
    setIsRetrying(true);
    setAnalysisError(null);
    try {
      const headers = await getApiHeaders();
      const res = await fetch("/api/v1/analysis/generate", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "daily", entryId: todayEntry.id }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setAnalysisError((errData as { message?: string }).message ?? "再分析に失敗しました。");
        return;
      }
      const data = (await res.json()) as {
        payload?: unknown;
        regenerationBRemaining?: number;
      };
      const next = normalizeAnalysis(data.payload);
      if (next) {
        setAnalysis(next);
        setHasDailyAnalysis(true);
        if (typeof data.regenerationBRemaining === "number") {
          setJournalRegenerationBRemaining(data.regenerationBRemaining);
        }
      }
    } catch {
      setAnalysisError("再分析に失敗しました。");
    } finally {
      setIsRetrying(false);
    }
  };

  /** ふりかえりを保存し、返却された日次分析を表示する */
  const handleSave = async () => {
    if (!text.trim() || !selectedMood) return;

    const hadEntryToday = !!todayEntry;
    setIsSaved(true);
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const headers = await getApiHeaders();
      const response = await fetch("/api/v1/entries", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: text.trim(), mood: selectedMood }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        dailyAnalysis?: unknown;
      };

      if (!response.ok) {
        setAnalysisError(
          data.message ?? (response.status === 429 ? "本日はすでに投稿済みです。" : "保存に失敗しました。")
        );
        setAnalysis(null);
        setIsSaved(false);
        setIsAnalyzing(false);
        return;
      }

      setTodayEntry({
        id: typeof data.id === "string" ? data.id : "",
        body: text.trim(),
        mood: selectedMood,
      });
      if (!hadEntryToday) {
        setDatesWithEntries((prev) => new Set([...prev, today]));
        setWeekDays((prev) => prev.map((d) => (d.today ? { ...d, done: true } : d)));
      }

      const next = normalizeAnalysis(data.dailyAnalysis);
      if (next) {
        setAnalysis(next);
        setHasDailyAnalysis(true);
      } else {
        setAnalysis(null);
        setHasDailyAnalysis(false);
        setAnalysisError("AI分析に失敗しました。しばらく経ってから再試行してください。");
      }
    } catch {
      setAnalysisError("保存または分析に失敗しました。");
      setAnalysis(null);
      setIsSaved(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /** 現在の文字数（MAX_CHARS 制限済み） */
  const charCount = text.length;
  /** 文字数割合（90%超で警告表示用） */
  const charPercentage = (charCount / MAX_CHARS) * 100;
  /** 種類 A: 未取得救済の再試行 */
  const showRetryTypeA =
    analysisError ||
    (!isAnalyzing && !isRetrying && !analysis && !!todayEntry?.id);
  /** 種類 B: 分析取得済みで Deep のみ・クォータ残あり */
  const showRetryTypeB =
    !isAnalyzing &&
    !isRetrying &&
    !!analysis &&
    plan === "deep" &&
    hasDailyAnalysis &&
    journalRegenerationBRemaining > 0 &&
    !!todayEntry?.id;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
      <header className="relative mb-10 flex flex-row items-center gap-4 py-4">
        <RippleMotif size="xs" animate={false} className="shrink-0" />
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground mb-0.5">
            {new Date().toLocaleDateString("ja-JP", {
              timeZone: "Asia/Tokyo",
              weekday: "short",
              month: "numeric",
              day: "numeric",
            })}
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            今日のふりかえり
          </h1>
        </div>
      </header>

      <section className="mb-8 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">継続日数</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {streakDays}
              <span className="text-sm font-normal text-muted-foreground ml-1">日</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {weekDays.map((d) => (
              <div key={d.day} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{d.day}</span>
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors",
                    d.done && !d.today && "bg-foreground/15 text-foreground",
                    d.today && "ring-2 ring-foreground/60 bg-foreground/10 text-foreground font-semibold",
                    !d.done && !d.today && "bg-secondary text-muted-foreground"
                  )}
                  title={d.today ? "今日" : undefined}
                >
                  {d.done ? "✓" : d.today ? "今日" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!isSaved ? (
        <>
          <div className="mb-6">
            <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
              今日一日を感情で表すと、どれに近いですか？
            </label>
            <div className="flex gap-2">
              {MOOD_OPTIONS.map((mood) => {
                const Icon = mood.Icon;
                return (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => setSelectedMood(mood.value)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 transition-all cursor-pointer",
                      selectedMood === mood.value
                        ? "border-foreground/40 bg-foreground/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{mood.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <label
                htmlFor="journal-input"
                className="min-w-0 flex-1 text-xs font-medium uppercase tracking-widest text-muted-foreground"
              >
                選んだ気分の理由や、今日あったこと・考えていること
              </label>
              <button
                type="button"
                onClick={() => setHintDialogOpen(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                aria-haspopup="dialog"
                aria-expanded={hintDialogOpen}
                aria-label="より良い分析をするためのヒントを開く"
              >
                <Lightbulb className="h-3.5 w-3.5 shrink-0" aria-hidden />
                より良い分析をするためヒント
              </button>
            </div>

            <Dialog open={hintDialogOpen} onOpenChange={setHintDialogOpen}>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base">
                    より良い分析をするためのヒント
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    入力例とポイントの説明
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-xs leading-relaxed text-foreground">
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 font-medium text-foreground">
                      <Lightbulb className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ポイント
                    </p>
                    <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                      {JOURNAL_INPUT_GUIDE.points.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1.5 font-medium text-foreground">
                      ❌ 分析精度が低下する例
                    </p>
                    <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-muted-foreground whitespace-pre-wrap">
                      {JOURNAL_INPUT_GUIDE.bad}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1.5 font-medium text-foreground">
                      ✅ 分析精度が高くなる例
                    </p>
                    <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-muted-foreground whitespace-pre-wrap">
                      {JOURNAL_INPUT_GUIDE.good}
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="rounded-xl border border-border bg-card overflow-hidden focus-within:ring-1 focus-within:ring-foreground/20 transition-shadow">
              <textarea
                id="journal-input"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                placeholder="なぜその気分になったか、今日あったことや考えたことを自由に書いてください…"
                className="w-full min-h-[200px] resize-none rounded-xl border-0 bg-card p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0"
              />
            </div>
            <p className="mt-2 text-right">
              <span
                className={cn(
                  "text-[10px] tabular-nums text-muted-foreground",
                  charPercentage > 90 && "text-red-600"
                )}
              >
                {charCount}/{MAX_CHARS}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!text.trim() || !selectedMood}
            className={cn(
              "w-full rounded-xl py-3 text-sm font-medium transition-all border-2",
              text.trim() && selectedMood
                ? "bg-foreground text-background hover:bg-foreground/90 cursor-pointer border-transparent"
                : "border-border bg-muted/50 text-muted-foreground cursor-not-allowed opacity-70 hover:opacity-70"
            )}
            aria-disabled={!text.trim() || !selectedMood}
          >
            ふりかえりを保存する
          </button>
        </>
      ) : (
        <div className="space-y-6">
          {todayEntry && (
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
                今日のふりかえり（保存済み）
              </p>
              {todayEntry.mood && (() => {
                const opt = MOOD_OPTIONS.find((m) => m.value === todayEntry.mood);
                if (!opt) return null;
                const Icon = opt.Icon;
                return (
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-4 w-4 text-foreground" />
                    <span className="text-xs font-medium text-foreground">{opt.label}</span>
                  </div>
                );
              })()}
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {todayEntry.body}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-40 pointer-events-none">
              <RippleMotif size="md" />
            </div>
            <h2 className="relative text-sm font-semibold text-foreground mb-4">ふりかえり分析結果</h2>

            {isAnalyzing && (
              <p className="text-xs text-muted-foreground">ふりかえりを分析しています…</p>
            )}

            {!isAnalyzing && analysis && (
              <div className="space-y-5">
                {(analysis.primaryEmotion || analysis.secondaryEmotion) && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
                      感情
                    </p>
                    <div className="space-y-2">
                      {analysis.primaryEmotion && (
                        <p className="text-sm text-foreground leading-relaxed">
                          <span className="text-muted-foreground">一番強かった感情：</span>
                          {analysis.primaryEmotion}
                        </p>
                      )}
                      {analysis.secondaryEmotion && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          <span className="text-muted-foreground/80">その奥にある感情：</span>
                          {analysis.secondaryEmotion}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {Array.isArray(analysis.thoughtPatterns) && analysis.thoughtPatterns.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
                      思考傾向
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
                      {analysis.thoughtPatterns.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.tension && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
                      緊張・葛藤
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">{analysis.tension}</p>
                  </div>
                )}
                {analysis.metaInsight && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
                      メタな気づき
                    </p>
                    <p className="text-sm text-foreground leading-relaxed italic">
                      {analysis.metaInsight}
                    </p>
                  </div>
                )}
                {analysis.question && (
                  <div className="border-t border-border pt-4">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
                      問い
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      「{analysis.question}」
                    </p>
                  </div>
                )}
              </div>
            )}

            {!isAnalyzing && !isRetrying && !analysis && !analysisError && (
              <p className="text-xs text-muted-foreground">
                ふりかえりが保存されました。AI分析がここに表示されます。
              </p>
            )}

            {showRetryTypeA && (
              <div className="mt-4">
                {analysisError && (
                  <p className="text-xs text-red-600 mb-3">{analysisError}</p>
                )}
                <button
                  type="button"
                  onClick={handleRetryAnalysisTypeA}
                  disabled={isRetrying}
                  className="rounded-lg border border-foreground/20 bg-foreground/5 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-foreground/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRetrying ? "分析中…" : "AI分析を再試行する"}
                </button>
              </div>
            )}

            {showRetryTypeB && (
              <div className="mt-4 space-y-2">
                {analysisError && (
                  <p className="text-xs text-red-600">{analysisError}</p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  再分析（今月あと {journalRegenerationBRemaining} / {journalRegenerationBLimit} 回）
                </p>
                <button
                  type="button"
                  onClick={handleRetryAnalysisTypeB}
                  disabled={isRetrying}
                  className="rounded-lg border border-foreground/30 bg-foreground/10 px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-foreground/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRetrying ? "分析中…" : "日次分析をやり直す（Deep）"}
                </button>
              </div>
            )}

            {plan === "free" && hasDailyAnalysis && analysis && !showRetryTypeB && (
              <p className="mt-4 text-[10px] text-muted-foreground">
                分析のやり直しは Deep プランで利用できます（今月の回数制限あり）。
              </p>
            )}

            {plan === "deep" && hasDailyAnalysis && analysis && journalRegenerationBRemaining === 0 && (
              <p className="mt-4 text-[10px] text-muted-foreground">
                今月の再分析は上限に達しました。来月から再度お試しください。
              </p>
            )}
          </div>

          {plan !== "deep" && (
            <div className="rounded-xl border border-dashed border-foreground/20 bg-secondary/30 p-6 text-center">
              <p className="text-xs font-semibold text-foreground mb-1">
                もっと深く自分を知りたいですか？
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Deepプランでは、週次のパターン分析や人格サマリー、問いかけモードなどが使えます。
              </p>
              <Link
                href="/settings"
                className="inline-block rounded-lg border border-foreground/20 bg-foreground/10 px-6 py-2 text-xs font-medium text-foreground transition-colors hover:bg-foreground/15 cursor-pointer"
              >
                Deepプランを確認する
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
