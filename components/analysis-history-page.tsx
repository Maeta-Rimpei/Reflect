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
  AnalysisReportItem,
} from "@/types/analysis";

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

/** リスト表示用の短いラベル（年グループ内）。週次: MM月dd日～MM月dd日、月次: MM月、年次: そのまま getPeriodLabel */
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

const BADGE_LABELS: Record<string, string> = {
  weekly: "週次",
  monthly: "月次",
  yearly: "年次",
};

/** 週次・月次・年次レポートの履歴一覧と詳細を表示する（Deep 専用）。初回データはサーバーから渡す。 */
export function AnalysisHistoryPage({
  initialData,
}: {
  /** サーバーで取得した初回データ（必須） */
  initialData: AnalysisHistoryInitialData;
}) {
  const [activeTab, setActiveTab] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [selected, setSelected] = useState<AnalysisReportItem | null>(null);

  const lists = initialData.lists;

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
          週次・月次・年次レポートの一覧です。タップして内容を確認できます。
        </p>
      </header>

      <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as "weekly" | "monthly" | "yearly");
            setSelected(null);
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
                <TabsTrigger
                  value="weekly"
                  className="flex-1 rounded-lg text-xs py-2.5 font-medium cursor-pointer data-[state=inactive]:text-muted-foreground data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:ring-2 data-[state=active]:ring-foreground/30 data-[state=active]:ring-offset-1"
                >
                  週次
                </TabsTrigger>
                <TabsTrigger
                  value="monthly"
                  className="flex-1 rounded-lg text-xs py-2.5 font-medium cursor-pointer data-[state=inactive]:text-muted-foreground data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:ring-2 data-[state=active]:ring-foreground/30 data-[state=active]:ring-offset-1"
                >
                  月次
                </TabsTrigger>
                <TabsTrigger
                  value="yearly"
                  className="flex-1 rounded-lg text-xs py-2.5 font-medium cursor-pointer data-[state=inactive]:text-muted-foreground data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:ring-2 data-[state=active]:ring-foreground/30 data-[state=active]:ring-offset-1"
                >
                  年次
                </TabsTrigger>
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
              badgeLabel={BADGE_LABELS.weekly}
              getPeriodLabel={getPeriodLabel}
              selected={selected}
              onSelect={setSelected}
            />
          </TabsContent>
          <TabsContent value="monthly" className="mt-0 space-y-4">
            <ReportList
              items={lists.monthly}
              reportType="monthly"
              badgeLabel={BADGE_LABELS.monthly}
              getPeriodLabel={getPeriodLabel}
              selected={selected}
              onSelect={setSelected}
            />
          </TabsContent>
          <TabsContent value="yearly" className="mt-0 space-y-4">
            <ReportList
              items={lists.yearly}
              reportType="yearly"
              badgeLabel={BADGE_LABELS.yearly}
              getPeriodLabel={getPeriodLabel}
              selected={selected}
              onSelect={setSelected}
            />
          </TabsContent>
        </Tabs>
    </div>
  );
}

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
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">
          この種類のレポートはまだありません。
        </p>
        <Link
          href="/analysis"
          className="inline-block mt-3 text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline"
        >
          Deep分析で生成する
        </Link>
      </div>
    );
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
                  <button
                    type="button"
                    onClick={() => onSelect(isSelected ? null : item)}
                    className={`
                      w-full text-left rounded-xl border px-4 py-3 transition-colors cursor-pointer
                      ${isSelected ? "border-foreground/30 bg-foreground/5" : "border-border bg-card hover:border-foreground/20"}
                    `}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {label}
                      </span>
                      {isSelected ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  {isSelected && (
                    <div className="mt-3 rounded-xl border border-border bg-card p-5 space-y-6">
                      <ReportView
                        report={{
                          period: item.period,
                          payload: item.payload,
                        }}
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
