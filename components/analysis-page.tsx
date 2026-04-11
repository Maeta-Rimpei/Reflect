"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { RippleMotif } from "@/components/ripple-motif";
import { ConfirmDialog, useConfirmDialog } from "@/components/ui/confirm-dialog";
import { getApiHeaders } from "@/lib/api-auth";
import {
  getMonthLabel,
  getMonthRangeInTokyo,
  getWeekRangeInTokyo,
  getLast12MonthsRangeInTokyo,
} from "@/lib/date-utils";
import { ReportView } from "@/components/report-view";
import type {
  PersonalityData,
  WeeklyPayload,
  MonthlyPayload,
  YearlyPayload,
  AnalysisInitialData,
  WeeklyReportState,
  MonthlyReportState,
  YearlyReportState,
} from "@/types/analysis";
import { PLAN_DEEP, PLAN_FREE } from "@/constants/plan";
import type { Plan } from "@/types/plan";

/** 生成中バナー用ラベル */
const GENERATING_LABEL: Record<
  "weekly" | "monthly" | "yearly" | "personality" | "question",
  string
> = {
  weekly: "週次レポート",
  monthly: "月次レポート",
  yearly: "年次レポート",
  personality: "人格サマリー",
  question: "問いかけ",
};

/** 週次・月次・人格・問いかけの分析レポートを表示するページコンポーネント */
export function AnalysisPage({
  initialData,
}: {
  /** サーバーで取得した初回データ。ある場合はクライアントの初回 fetch をスキップする */
  initialData?: AnalysisInitialData | null;
}) {
  /** 今週の週次レポート（期間 + ペイロード） */
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportState>(
    initialData?.weeklyReport ?? null,
  );
  /** 今月の月次レポート（期間 + ペイロード） */
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReportState>(
    initialData?.monthlyReport ?? null,
  );
  /** 直近12ヶ月の年次レポート（期間 + ペイロード） */
  const [yearlyReport, setYearlyReport] = useState<YearlyReportState>(
    initialData?.yearlyReport ?? null,
  );
  /** 人格サマリー（傾向・強み・弱み・落ち込み条件・回復行動など） */
  const [personalitySummary, setPersonalitySummary] =
    useState<PersonalityData | null>(initialData?.personalitySummary ?? null);
  /** 問いかけの文言リスト */
  const [questions, setQuestions] = useState<string[]>(
    initialData?.questions ?? [],
  );
  /** 初回データ取得中か（initialData がある場合はサーバーで済んでいるので false） */
  const [loading, setLoading] = useState(!initialData);
  /** どの種類の生成中か（週次/月次/年次/人格/問いかけ）。null は非生成中 */
  const [generating, setGenerating] = useState<
    "weekly" | "monthly" | "yearly" | "personality" | "question" | null
  >(null);
  /** 生成API失敗時のエラーメッセージ */
  const [generateError, setGenerateError] = useState<string | null>(null);
  /** 直前に失敗した生成タイプ（再生成ボタンで同じ処理を再実行するため） */
  const [lastFailedGenerateType, setLastFailedGenerateType] = useState<
    "weekly" | "monthly" | "yearly" | "personality" | "question" | null
  >(null);
  /** ユーザーのプラン（free / deep）。Deep で全タブ利用可能 */
  const [plan, setPlan] = useState<Plan>(initialData?.plan ?? PLAN_FREE);

  /** 確認ダイアログ（useConfirmDialog で任意の画面から同じパターンで利用可能） */
  const { dialogProps: confirmDialogProps, openDialog, handleCancel: closeConfirmDialog } = useConfirmDialog(generating !== null);

  /** 初回・再取得: me / 週次 / 月次 / 年次 / 人格サマリー / 問いかけ を一括取得 */
  const loadData = async () => {
    const headers = await getApiHeaders();
    const { from: wFrom, to: wTo } = getWeekRangeInTokyo();
    const { from: mFrom, to: mTo } = getMonthRangeInTokyo();
    const { from: yFrom, to: yTo } = getLast12MonthsRangeInTokyo();

    const [meRes, weeklyRes, monthlyRes, yearlyRes, summaryRes, questionRes] =
      await Promise.all([
        fetch("/api/v1/me", { headers, credentials: "include" }),
        fetch(
          `/api/v1/analysis?type=weekly&from=${wFrom}&to=${wTo}`,
          { headers, credentials: "include" },
        ),
        fetch(
          `/api/v1/analysis?type=monthly&from=${mFrom}&to=${mTo}`,
          { headers, credentials: "include" },
        ),
        fetch(
          `/api/v1/analysis?type=yearly&from=${yFrom}&to=${yTo}`,
          { headers, credentials: "include" },
        ),
        fetch("/api/v1/analysis/summary", {
          headers,
          credentials: "include",
        }),
        fetch("/api/v1/analysis?type=question", {
          headers,
          credentials: "include",
        }),
      ]);

    if (meRes.ok) {
      const me = (await meRes.json()) as { plan?: Plan };
      setPlan(me.plan ?? PLAN_FREE);
    }

    if (weeklyRes.ok) {
      const list = (await weeklyRes.json()) as Array<{
        period: { from: string; to: string };
        payload: WeeklyPayload;
      }>;
      if (list?.length > 0) {
        setWeeklyReport({
          period: list[0].period,
          payload: list[0].payload,
        });
      }
    }

    if (monthlyRes.ok) {
      const list = (await monthlyRes.json()) as Array<{
        period: { from: string; to: string };
        payload: MonthlyPayload;
      }>;
      if (list?.length > 0) {
        setMonthlyReport({
          period: list[0].period,
          payload: list[0].payload,
        });
      }
    }

    if (yearlyRes.ok) {
      const list = (await yearlyRes.json()) as Array<{
        period: { from: string; to: string };
        payload: YearlyPayload;
      }>;
      if (list?.length > 0) {
        setYearlyReport({
          period: list[0].period,
          payload: list[0].payload,
        });
      }
    }

    if (summaryRes.ok) {
      const data = (await summaryRes.json()) as PersonalityData;
      setPersonalitySummary(data);
    }

    if (questionRes.ok) {
      const list = (await questionRes.json()) as Array<{
        payload: { questions?: string[] };
      }>;
      const latest = list?.[0]?.payload?.questions;
      setQuestions(Array.isArray(latest) ? latest : []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (initialData) return;
    void loadData();
  }, [initialData]);

  /** 週次レポートを生成する（確認なしで即実行） */
  const handleGenerateWeekly = async () => {
    const headers = await getApiHeaders();
    setGenerating("weekly");
    setGenerateError(null);
    const { from, to } = getWeekRangeInTokyo();
    try {
      const res = await fetch("/api/v1/analysis/generate", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "weekly", from, to }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setWeeklyReport({
          period: data.period ?? { from, to },
          payload: data.payload ?? data,
        });
        setGenerateError(null);
        setLastFailedGenerateType(null);
      } else {
        setGenerateError(
          data.message ??
            "週次レポートの生成にはDeepプランが必要です。",
        );
        setLastFailedGenerateType("weekly");
      }
    } finally {
      setGenerating(null);
    }
  };

  /** 確認後に実行する月次レポート生成（API 呼び出し） */
  const executeGenerateMonthly = async () => {
    const headers = await getApiHeaders();
    setGenerating("monthly");
    setGenerateError(null);
    const { from, to } = getMonthRangeInTokyo();
    try {
      const res = await fetch("/api/v1/analysis/generate", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "monthly", from, to }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMonthlyReport({
          period: data.period ?? { from, to },
          payload: data.payload ?? data,
        });
        setGenerateError(null);
        setLastFailedGenerateType(null);
      } else {
        setGenerateError(data.message ?? "月次レポートの生成に失敗しました。");
        setLastFailedGenerateType("monthly");
      }
    } finally {
      setGenerating(null);
    }
  };

  /** 月次レポート生成前に確認ダイアログを開く */
  const handleGenerateMonthly = () => {
    const { from } = getMonthRangeInTokyo();
    openDialog({
      title: "月次レポートを生成しますか？",
      description: `${getMonthLabel(from)}の月次レポートを生成します。月次レポートは月に1回のみ生成できます。`,
      confirmLabel: "生成する",
      onConfirm: () => {
        void executeGenerateMonthly();
        closeConfirmDialog();
      },
    });
  };

  /** 確認後に実行する年次レポート生成（API 呼び出し） */
  const executeGenerateYearly = async () => {
    const headers = await getApiHeaders();
    setGenerating("yearly");
    setGenerateError(null);
    const { from, to } = getLast12MonthsRangeInTokyo();
    try {
      const res = await fetch("/api/v1/analysis/generate", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "yearly", from, to }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setYearlyReport({
          period: data.period ?? { from, to },
          payload: data.payload ?? data,
        });
        setGenerateError(null);
        setLastFailedGenerateType(null);
      } else {
        setGenerateError(data.message ?? "年次レポートの生成に失敗しました。");
        setLastFailedGenerateType("yearly");
      }
    } finally {
      setGenerating(null);
    }
  };

  /** 年次レポート生成前に確認ダイアログを開く */
  const handleGenerateYearly = () => {
    const { from, to } = getLast12MonthsRangeInTokyo();
    openDialog({
      title: "年次レポートを生成しますか？",
      description: `直近12ヶ月（${getMonthLabel(from)}〜${getMonthLabel(to)}）の年次レポートを生成します。週次・月次レポートをもとに思考傾向・動機・特性をまとめます。年次は同じ期間で1回のみ生成できます。`,
      confirmLabel: "生成する",
      onConfirm: () => {
        void executeGenerateYearly();
        closeConfirmDialog();
      },
    });
  };

  /** 確認後に実行する人格サマリー生成（API 呼び出し。問いかけも更新される場合あり） */
  const executeGeneratePersonality = async () => {
    const headers = await getApiHeaders();
    setGenerating("personality");
    setGenerateError(null);
    try {
      const res = await fetch("/api/v1/analysis/generate", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "personality" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPersonalitySummary({
          tendency: data.payload?.tendency ?? "",
          strengthSignals: data.payload?.strengthSignals ?? [],
          riskPatterns: data.payload?.riskPatterns ?? [],
          downTriggers: data.payload?.downTriggers ?? "",
          recoveryActions: data.payload?.recoveryActions ?? "",
          updatedAt: data.createdAt,
        });
        if (
          Array.isArray(data.questions) &&
          data.questions.length > 0
        ) {
          setQuestions(data.questions);
        }
        setGenerateError(null);
        setLastFailedGenerateType(null);
      } else {
        setGenerateError(
          data.message ?? "人格サマリーの生成に失敗しました。",
        );
        setLastFailedGenerateType("personality");
      }
    } finally {
      setGenerating(null);
    }
  };

  /** 人格サマリー生成前に確認ダイアログを開く */
  const handleGeneratePersonality = () => {
    openDialog({
      title: "人格サマリーを生成しますか？",
      description:
        "これまでの分析（年次・週次・月次レポート）をもとに人格サマリーを生成します。年次がなくても週次・月次があれば生成できます。前回の生成から1か月経過しないと再生成できません。問いかけも同時に更新されます。",
      confirmLabel: "生成する",
      onConfirm: () => {
        void executeGeneratePersonality();
        closeConfirmDialog();
      },
    });
  };

  /** 確認後に実行する問いかけ再生成（API 呼び出し） */
  const executeGenerateQuestion = async () => {
    const headers = await getApiHeaders();
    setGenerating("question");
    setGenerateError(null);
    try {
      const res = await fetch("/api/v1/analysis/generate", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "question" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          setQuestions(data.questions);
        }
        setGenerateError(null);
        setLastFailedGenerateType(null);
      } else {
        setGenerateError(
          data.message ?? "問いかけの生成に失敗しました。",
        );
        setLastFailedGenerateType("question");
      }
    } finally {
      setGenerating(null);
    }
  };

  /** 失敗した生成を再実行する（エラー表示の「再生成」ボタン用） */
  const handleRetryGenerate = () => {
    if (!lastFailedGenerateType) return;
    setGenerateError(null);
    setLastFailedGenerateType(null);
    switch (lastFailedGenerateType) {
      case "weekly":
        void handleGenerateWeekly();
        break;
      case "monthly":
        void executeGenerateMonthly();
        break;
      case "yearly":
        void executeGenerateYearly();
        break;
      case "personality":
        void executeGeneratePersonality();
        break;
      case "question":
        void executeGenerateQuestion();
        break;
    }
  };

  /** 問いかけ再生成前に確認ダイアログを開く */
  const handleGenerateQuestion = () => {
    openDialog({
      title: "問いかけを再生成しますか？",
      description:
        "人格サマリーに基づいて新しい問いかけを生成します。問いかけは週に1回のみ生成できます。",
      confirmLabel: "生成する",
      onConfirm: () => {
        void executeGenerateQuestion();
        closeConfirmDialog();
      },
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
        <div
          className="flex flex-col items-center justify-center gap-3 py-12 text-center"
          role="status"
          aria-live="polite"
          aria-label="分析レポートを読み込み中"
        >
          <Loader2 className="h-9 w-9 animate-spin text-foreground/70" aria-hidden />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">読み込み中です</p>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              レポートの情報を取得しています。しばらくお待ちください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  /** 人格サマリーを表示用セクション配列に変換（タイトル + 本文） */
  const personalitySections = personalitySummary
    ? [
        { title: "傾向のまとめ", content: personalitySummary.tendency },
        {
          title: "強みシグナル",
          content: personalitySummary.strengthSignals.join(" / ") || "—",
        },
        {
          title: "リスクパターン",
          content: personalitySummary.riskPatterns.join(" / ") || "—",
        },
        {
          title: "落ち込みやすい条件",
          content: personalitySummary.downTriggers || "—",
        },
        {
          title: "回復しやすい行動",
          content: personalitySummary.recoveryActions || "—",
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-2xl min-w-0 px-4 py-8 md:px-6 md:py-12 overflow-x-hidden">
      {/* 確認ダイアログ */}
      <ConfirmDialog {...confirmDialogProps} />

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Deep分析
          </p>
          {plan !== PLAN_DEEP && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 rounded-md"
            >
              DEEP
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          分析レポート
        </h1>
        {plan === PLAN_DEEP && (
          <Link
            href="/analysis/history"
            className="inline-block mt-2 text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            過去のレポートを見る
          </Link>
        )}
      </div>

      {generating && (
        <div
          className="mb-4 rounded-lg border border-border bg-muted/50 px-4 py-3 flex gap-3 text-left"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2
            className="h-5 w-5 shrink-0 animate-spin text-foreground/70 mt-0.5"
            aria-hidden
          />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">
              {GENERATING_LABEL[generating]}を生成しています
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              分析の生成には数十秒〜1分ほどかかることがあります。この画面のままお待ちください。
            </p>
          </div>
        </div>
      )}

      {generateError && (
        <div className="mb-4 rounded-lg border border-red-600/50 bg-destructive/10 px-4 py-3 text-xs text-destructive space-y-2">
          <p className="text-red-600">{generateError}</p>
          <div className="flex flex-wrap items-center gap-2">
            {lastFailedGenerateType && (
              <button
                type="button"
                onClick={handleRetryGenerate}
                disabled={generating !== null}
                className="rounded-lg bg-foreground text-background px-3 py-1.5 font-medium hover:bg-destructive/20 disabled:opacity-50 cursor-pointer"
              >
                {generating === lastFailedGenerateType ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    再生成中…
                  </span>
                ) : (
                  "再生成する"
                )}
              </button>
            )}
            {plan !== PLAN_DEEP && (
              <Link
                href="/settings"
                className="inline-block font-medium text-foreground underline underline-offset-2 hover:no-underline"
              >
                Deepプランへ →
              </Link>
            )}
          </div>
        </div>
      )}

      <Tabs defaultValue="weekly" className="mb-8">
        <p className="md:hidden mt-2 text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <ChevronLeft className="h-3 w-3" />
            スワイプで他のタブを見る
            <ChevronRight className="h-3 w-3" />
        </p>
        <div className="relative md:static border-b border-border pb-2">
          <div className="overflow-x-auto -mx-4 px-4 md:-mx-6 md:px-6 bg-secondary md:bg-transparent rounded-xl md:rounded-none">
            <TabsList className="w-max min-w-full bg-secondary rounded-xl p-1.5 h-auto gap-1">
              <TabsTrigger
            value="weekly"
            className="flex-1 rounded-lg text-xs py-2.5 font-medium cursor-pointer data-[state=inactive]:text-muted-foreground data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:ring-2 data-[state=active]:ring-foreground/30 data-[state=active]:ring-offset-1"
          >
            週次レポート
          </TabsTrigger>
          <TabsTrigger
            value="monthly"
            className="flex-1 rounded-lg text-xs py-2.5 font-medium cursor-pointer data-[state=inactive]:text-muted-foreground data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:ring-2 data-[state=active]:ring-foreground/30 data-[state=active]:ring-offset-1"
          >
            月次レポート
          </TabsTrigger>
          <TabsTrigger
            value="yearly"
            className="flex-1 rounded-lg text-xs py-2.5 font-medium cursor-pointer data-[state=inactive]:text-muted-foreground data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:ring-2 data-[state=active]:ring-foreground/30 data-[state=active]:ring-offset-1"
          >
            年次レポート
          </TabsTrigger>
          <TabsTrigger
            value="personality"
            className="flex-1 rounded-lg text-xs py-2.5 font-medium cursor-pointer data-[state=inactive]:text-muted-foreground data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:ring-2 data-[state=active]:ring-foreground/30 data-[state=active]:ring-offset-1"
          >
            人格サマリー
          </TabsTrigger>
          <TabsTrigger
            value="questions"
            className="flex-1 rounded-lg text-xs py-2.5 font-medium cursor-pointer data-[state=inactive]:text-muted-foreground data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:ring-2 data-[state=active]:ring-foreground/30 data-[state=active]:ring-offset-1"
          >
            問いかけ
          </TabsTrigger>
            </TabsList>
          </div>
          {/* スマホ: 右端のグラデーションで「続きあり」を伝える */}
          <div
            className="md:hidden absolute right-0 top-0 bottom-0 w-6 pointer-events-none bg-linear-to-l from-secondary to-transparent rounded-r-xl"
            aria-hidden
          />

        </div>

        {/* ── 週次レポート ── */}
        <TabsContent value="weekly" className="mt-6 min-w-0">
          <div className="space-y-6">
            {weeklyReport ? (
              <ReportView
                report={weeklyReport}
                badgeLabel="週次"
                reportType="weekly"
              />
            ) : (
              <EmptyState
                message={
                  plan === PLAN_DEEP
                    ? "週次レポートはまだありません。"
                    : "週次レポートはDeepプランで利用できます。アップグレードすると生成できます。"
                }
                buttonLabel="今週のレポートを生成する"
                loading={generating === "weekly"}
                onClick={handleGenerateWeekly}
              />
            )}
          </div>
        </TabsContent>

        {/* ── 月次レポート ── */}
        <TabsContent value="monthly" className="mt-6 min-w-0">
          <div className="space-y-6">
            {monthlyReport ? (
              <ReportView
                report={monthlyReport}
                badgeLabel="月次"
                reportType="monthly"
              />
            ) : (
              <EmptyState
                message={
                  plan === PLAN_DEEP
                    ? `${getMonthLabel(getMonthRangeInTokyo().from)}の月次レポートはまだありません。`
                    : "月次レポートはDeepプランで利用できます。アップグレードすると生成できます。"
                }
                buttonLabel="月次レポートを生成する"
                loading={generating === "monthly"}
                onClick={handleGenerateMonthly}
              />
            )}
          </div>
        </TabsContent>

        {/* ── 年次レポート ── */}
        <TabsContent value="yearly" className="mt-6 min-w-0">
          <div className="space-y-6">
            {yearlyReport ? (
              <ReportView
                report={yearlyReport}
                badgeLabel="年次"
                reportType="yearly"
              />
            ) : (
              <EmptyState
                message={
                  plan === PLAN_DEEP
                    ? "直近12ヶ月の年次レポートはまだありません。"
                    : "年次レポートはDeepプランで利用できます。アップグレードすると生成できます。"
                }
                buttonLabel="年次レポートを生成する"
                loading={generating === "yearly"}
                onClick={handleGenerateYearly}
              />
            )}
          </div>
        </TabsContent>

        {/* ── 人格サマリー ── */}
        <TabsContent value="personality" className="mt-6 min-w-0">
          <div className="space-y-6">
            {personalitySummary ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      最終更新
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {personalitySummary.updatedAt
                        ? new Date(
                            personalitySummary.updatedAt,
                          ).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })
                        : "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePersonality}
                    disabled={generating !== null}
                    className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-foreground hover:bg-accent cursor-pointer disabled:opacity-50"
                  >
                    再生成する
                  </button>
                </div>

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="relative bg-accent p-5 border-b border-border overflow-hidden">
                    <div className="absolute -top-6 -right-6 opacity-30 pointer-events-none">
                      <RippleMotif size="md" />
                    </div>
                    <h3 className="relative text-sm font-semibold text-foreground mb-1">
                      あなたの人格サマリー
                    </h3>
                    <p className="relative text-xs text-muted-foreground">
                      ふりかえりの分析サマリから自動生成
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    {personalitySections.map((section) => (
                      <div key={section.title} className="p-5">
                        <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                          {section.title}
                        </h4>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {section.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                message={
                  plan === PLAN_DEEP
                    ? "人格サマリーはまだありません。"
                    : "人格サマリーはDeepプランで利用できます。アップグレードすると利用できます。"
                }
                buttonLabel="人格サマリーを生成する"
                loading={generating === "personality"}
                onClick={handleGeneratePersonality}
              />
            )}
          </div>
        </TabsContent>

        {/* ── 問いかけ ── */}
        <TabsContent value="questions" className="mt-6 min-w-0">
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                  気づきを促す問いかけ
                </h3>
                <p className="text-xs text-muted-foreground">
                  ふりかえりのパターンに基づき、「考えるきっかけになる質問」を生成します。
                </p>
              </div>
              {questions.length > 0 && (
                <button
                  type="button"
                  onClick={handleGenerateQuestion}
                  disabled={generating !== null}
                  className="rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-foreground hover:bg-accent cursor-pointer disabled:opacity-50 shrink-0"
                >
                  再生成する
                </button>
              )}
            </div>

            {questions.length > 0 ? (
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">
                        {i + 1}
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">
                        {q}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                問いかけは人格サマリー生成時に一緒に作成されます。人格サマリーを生成してください。
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** レポート未生成時の空状態（メッセージ + 生成ボタン） */
function EmptyState({
  message,
  buttonLabel,
  loading,
  onClick,
}: {
  message: string;
  buttonLabel: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center">
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="rounded-xl bg-foreground text-background px-6 py-2.5 text-sm font-medium hover:bg-foreground/90 disabled:opacity-90 flex items-center justify-center gap-2 mx-auto cursor-pointer min-w-[12rem]"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            生成中…
          </>
        ) : (
          buttonLabel
        )}
      </button>
      {loading ? (
        <p className="mt-4 text-[11px] text-muted-foreground leading-relaxed max-w-sm mx-auto">
          画面上部にも進捗を表示しています。混雑時は完了まで1分ほどかかることがあります。
        </p>
      ) : null}
    </div>
  );
}
