"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportView } from "@/components/report-view";
import {
  formatMonthDayJp,
  formatMonthOnlyJp,
  formatYearJp,
  getPeriodLabel,
} from "@/lib/date-utils";
import type {
  AnalysisHistoryInitialData,
  AnalysisHistoryMiscItem,
  AnalysisReportItem,
  PersonalityData,
} from "@/types/analysis";

type TabType = "weekly" | "monthly" | "yearly" | "personality" | "question";

/** 年でグループ化（週次・月次は period.from の年、年次は period.to の年）。年の降順。 */
function groupItemsByYear(
  items: AnalysisReportItem[],
  reportType: "weekly" | "monthly" | "yearly",
): { year: string; items: AnalysisReportItem[] }[] {
  const map = new Map<string, AnalysisReportItem[]>();
  for (const item of items) {
    const year =
      reportType === "yearly"
        ? item.period.to.slice(0, 4)
        : item.period.from.slice(0, 4);
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(item);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, list]) => ({ year, items: list }));
}

/** リスト表示用の短いラベル（年グループ内）。 */
function getShortPeriodLabel(
  reportType: "weekly" | "monthly" | "yearly",
  item: AnalysisReportItem,
): string {
  const { from, to } = item.period;
  if (reportType === "weekly") {
    return `${formatMonthDayJp(from)}～${formatMonthDayJp(to)}`;
  }
  if (reportType === "monthly") {
    return formatMonthOnlyJp(from);
  }
  return formatYearJp(to);
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

const TAB_TRIGGER_CLASS =
  "flex-1 rounded-lg text-xs py-2.5 font-medium cursor-pointer data-[state=inactive]:text-muted-foreground data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:ring-2 data-[state=active]:ring-foreground/30 data-[state=active]:ring-offset-1";

export function AnalysisHistoryPage({
  initialData,
}: {
  initialData: AnalysisHistoryInitialData;
}) {
  const [activeTab, setActiveTab] = useState<TabType>("weekly");
  const [selectedReport, setSelectedReport] = useState<AnalysisReportItem | null>(null);
  const [selectedMisc, setSelectedMisc] = useState<AnalysisHistoryMiscItem | null>(null);

  const lists = initialData.lists;

  const clearSelection = () => {
    setSelectedReport(null);
    setSelectedMisc(null);
  };

  return (
    <div className="mx-auto max-w-2xl min-w-0 px-4 py-8 md:px-6 md:py-12 overflow-x-hidden">
      <Link
        href="/analysis"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Deep分析に戻る
      </Link>

      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
          レポート履歴
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          過去のレポート
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          週次・月次・年次レポート、人格サマリー、問いかけの一覧です。
        </p>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as TabType);
          clearSelection();
        }}
        className="space-y-6"
      >
        <p className="md:hidden mt-2 text-[10px] text-muted-foreground flex items-center justify-center gap-1">
          <ChevronLeft className="h-3 w-3" />
          スワイプで他のタブを見る
          <ChevronRight className="h-3 w-3" />
        </p>
        <div className="relative md:static border-b border-border pb-2">
          <div className="overflow-x-auto -mx-4 px-4 md:-mx-6 md:px-6 bg-secondary md:bg-transparent rounded-xl md:rounded-none">
            <TabsList className="w-max min-w-full md:min-w-0 bg-secondary rounded-xl p-1.5 h-auto gap-1">
              <TabsTrigger value="weekly" className={TAB_TRIGGER_CLASS}>週次</TabsTrigger>
              <TabsTrigger value="monthly" className={TAB_TRIGGER_CLASS}>月次</TabsTrigger>
              <TabsTrigger value="yearly" className={TAB_TRIGGER_CLASS}>年次</TabsTrigger>
              <TabsTrigger value="personality" className={TAB_TRIGGER_CLASS}>人格</TabsTrigger>
              <TabsTrigger value="question" className={TAB_TRIGGER_CLASS}>問いかけ</TabsTrigger>
            </TabsList>
          </div>
          <div
            className="md:hidden absolute right-0 top-0 bottom-0 w-6 pointer-events-none bg-linear-to-l from-secondary to-transparent rounded-r-xl"
            aria-hidden
          />
        </div>

        <TabsContent value="weekly" className="mt-0 space-y-4">
          <ReportList
            items={lists.weekly}
            reportType="weekly"
            badgeLabel="週次"
            getPeriodLabel={getPeriodLabel}
            selected={selectedReport}
            onSelect={setSelectedReport}
          />
        </TabsContent>
        <TabsContent value="monthly" className="mt-0 space-y-4">
          <ReportList
            items={lists.monthly}
            reportType="monthly"
            badgeLabel="月次"
            getPeriodLabel={getPeriodLabel}
            selected={selectedReport}
            onSelect={setSelectedReport}
          />
        </TabsContent>
        <TabsContent value="yearly" className="mt-0 space-y-4">
          <ReportList
            items={lists.yearly}
            reportType="yearly"
            badgeLabel="年次"
            getPeriodLabel={getPeriodLabel}
            selected={selectedReport}
            onSelect={setSelectedReport}
          />
        </TabsContent>
        <TabsContent value="personality" className="mt-0 space-y-4">
          <MiscList
            items={lists.personality}
            emptyMessage="人格サマリーはまだ生成されていません。"
            selected={selectedMisc}
            onSelect={setSelectedMisc}
            renderDetail={(item) => <PersonalityDetail item={item} />}
          />
        </TabsContent>
        <TabsContent value="question" className="mt-0 space-y-4">
          <MiscList
            items={lists.question}
            emptyMessage="問いかけはまだ生成されていません。"
            selected={selectedMisc}
            onSelect={setSelectedMisc}
            renderDetail={(item) => <QuestionDetail item={item} />}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ────── 週次・月次・年次リスト ────── */

function ReportList({
  items,
  reportType,
  badgeLabel,
  getPeriodLabel,
  selected,
  onSelect,
}: {
  items: AnalysisReportItem[];
  reportType: "weekly" | "monthly" | "yearly";
  badgeLabel: string;
  getPeriodLabel: (item: AnalysisReportItem) => string;
  selected: AnalysisReportItem | null;
  onSelect: (item: AnalysisReportItem | null) => void;
}) {
  if (items.length === 0) {
    return <EmptyState message="この種類のレポートはまだありません。" />;
  }

  const grouped =
    reportType === "yearly"
      ? [{ year: "", items }]
      : groupItemsByYear(items, reportType);
  const isGrouped = reportType === "weekly" || reportType === "monthly";

  return (
    <div className="space-y-6">
      {grouped.map(({ year, items: yearItems }) => (
        <section key={year} className="space-y-2">
          {isGrouped && year && (
            <h3 className="text-sm font-semibold text-foreground sticky top-0 bg-background py-1">
              {year}年
            </h3>
          )}
          <ul className="space-y-2" role="list">
            {yearItems.map((item) => {
              const isSelected = selected?.id === item.id;
              const label = isGrouped
                ? getShortPeriodLabel(reportType, item)
                : getPeriodLabel(item);
              return (
                <li key={item.id}>
                  <ExpandButton
                    label={label}
                    isSelected={isSelected}
                    onClick={() => onSelect(isSelected ? null : item)}
                  />
                  {isSelected && (
                    <div className="mt-3 rounded-xl border border-border bg-card p-5 space-y-6">
                      <ReportView
                        report={{ period: item.period, payload: item.payload }}
                        badgeLabel={badgeLabel}
                        reportType={reportType}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ────── 人格サマリー・問いかけリスト ────── */

function MiscList({
  items,
  emptyMessage,
  selected,
  onSelect,
  renderDetail,
}: {
  items: AnalysisHistoryMiscItem[];
  emptyMessage: string;
  selected: AnalysisHistoryMiscItem | null;
  onSelect: (item: AnalysisHistoryMiscItem | null) => void;
  renderDetail: (item: AnalysisHistoryMiscItem) => React.ReactNode;
}) {
  if (items.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <ul className="space-y-2" role="list">
      {items.map((item) => {
        const isSelected = selected?.id === item.id;
        return (
          <li key={item.id}>
            <ExpandButton
              label={formatDateTime(item.createdAt)}
              isSelected={isSelected}
              onClick={() => onSelect(isSelected ? null : item)}
            />
            {isSelected && (
              <div className="mt-3 rounded-xl border border-border bg-card p-5 space-y-4">
                {renderDetail(item)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ────── 人格サマリー詳細 ────── */

function PersonalityDetail({ item }: { item: AnalysisHistoryMiscItem }) {
  const p = item.payload as PersonalityData;
  const sections = [
    { title: "傾向のまとめ", content: p.tendency },
    { title: "強みシグナル", content: (p.strengthSignals ?? []).join(" / ") || "—" },
    { title: "リスクパターン", content: (p.riskPatterns ?? []).join(" / ") || "—" },
    { title: "落ち込みやすい条件", content: p.downTriggers || "—" },
    { title: "回復しやすい行動", content: p.recoveryActions || "—" },
  ];

  return (
    <>
      {sections.map((s) => (
        <div key={s.title}>
          <h4 className="text-xs font-semibold text-muted-foreground mb-1">{s.title}</h4>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{s.content}</p>
        </div>
      ))}
    </>
  );
}

/* ────── 問いかけ詳細 ────── */

function QuestionDetail({ item }: { item: AnalysisHistoryMiscItem }) {
  const q = item.payload as { questions?: string[] };
  const questions = Array.isArray(q.questions) ? q.questions : [];

  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">問いかけがありません。</p>;
  }

  return (
    <ul className="space-y-3">
      {questions.map((text, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-foreground/10 text-xs font-semibold text-foreground">
            {i + 1}
          </span>
          <p className="text-sm text-foreground leading-relaxed pt-0.5">{text}</p>
        </li>
      ))}
    </ul>
  );
}

/* ────── 共通パーツ ────── */

function ExpandButton({
  label,
  isSelected,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full text-left rounded-xl border px-4 py-3 transition-colors cursor-pointer
        ${isSelected ? "border-foreground/30 bg-foreground/5" : "border-border bg-card hover:border-foreground/20"}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground ${isSelected ? "rotate-90" : ""}`}
        />
      </div>
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link
        href="/analysis"
        className="inline-block mt-3 text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline"
      >
        Deep分析で生成する
      </Link>
    </div>
  );
}
