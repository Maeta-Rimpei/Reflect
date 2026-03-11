"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateJp, formatMonthJp, formatYearJp } from "@/lib/date-utils";
import type {
  WeeklyPayload,
  MonthlyPayload,
  YearlyPayload,
  AnyReportPayload,
} from "@/types/analysis";

/** レポート種別に応じた期間ラベルを返す */
function getReportPeriodLabel(
  type: "weekly" | "monthly" | "yearly",
  period: { from: string; to: string },
): string {
  if (type === "weekly") {
    return `${formatDateJp(period.from)}～${formatDateJp(period.to)}`;
  }
  if (type === "monthly") {
    return formatMonthJp(period.from);
  }
  return formatYearJp(period.to);
}

/** ラベル付き文字列配列を表示するセクション */
function ListSection({ title, items }: { title: string; items?: string[] }) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      {list.map((item, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-foreground leading-relaxed">{item}</p>
        </div>
      ))}
    </div>
  );
}

/** テキスト1件のセクション */
function TextSection({ title, text }: { title: string; text?: string }) {
  if (text == null || text === "") return null;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function WeeklyReportBody({ payload }: { payload: WeeklyPayload }) {
  return (
    <>
      <ListSection title="今週の感情" items={payload.emotionDistribution} />
      <ListSection title="思考の傾向" items={payload.thoughtPatterns} />
      <ListSection title="ストレスのきっかけ" items={payload.stressTriggers} />
      <ListSection title="矛盾・葛藤" items={payload.notableContradictions} />
      <TextSection title="今週の観察" text={payload.weeklyInsight} />
    </>
  );
}

function MonthlyReportBody({ payload }: { payload: MonthlyPayload }) {
  return (
    <>
      <ListSection title="目立った感情" items={payload.dominantEmotions} />
      <ListSection title="繰り返す思考傾向" items={payload.recurringThoughtPatterns} />
      <ListSection title="行動パターン" items={payload.behaviorPatterns} />
      <ListSection title="ストレス源ランキング" items={payload.stressSourcesRanking} />
      <TextSection title="月の洞察" text={payload.monthlyInsight} />
    </>
  );
}

function YearlyReportBody({ payload }: { payload: YearlyPayload }) {
  return (
    <>
      <ListSection title="年間の思考傾向" items={payload.coreThoughtPatterns} />
      <TextSection title="感情の推移" text={payload.emotionTrend} />
      <ListSection title="ストレス源ランキング" items={payload.stressSourcesRanking} />
      <ListSection title="行動の動機" items={payload.motivationDrivers} />
      <ListSection title="観察された特性" items={payload.identityTraits} />
    </>
  );
}

function isWeekly(payload: AnyReportPayload): payload is WeeklyPayload {
  return "weeklyInsight" in payload;
}
function isMonthly(payload: AnyReportPayload): payload is MonthlyPayload {
  return "monthlyInsight" in payload;
}

/** 週次/月次/年次レポートの内容を表示する */
export function ReportView({
  report,
  badgeLabel,
  reportType = "weekly",
}: {
  report: { period: { from: string; to: string }; payload: AnyReportPayload };
  badgeLabel: string;
  reportType?: "weekly" | "monthly" | "yearly";
}) {
  const periodLabel = getReportPeriodLabel(reportType, report.period);

  return (
    <>
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">分析対象期間</p>
          <p className="text-sm font-medium text-foreground wrap-break-word">
            {periodLabel}
          </p>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] rounded-md border-border"
        >
          {badgeLabel}
        </Badge>
      </div>

      {isWeekly(report.payload) && <WeeklyReportBody payload={report.payload} />}
      {isMonthly(report.payload) && <MonthlyReportBody payload={report.payload} />}
      {!isWeekly(report.payload) && !isMonthly(report.payload) && (
        <YearlyReportBody payload={report.payload as YearlyPayload} />
      )}
    </>
  );
}
