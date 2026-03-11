"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Lock, MessageCircle, FileText, ArrowRight } from "lucide-react";
import { RippleMotif } from "@/components/ripple-motif";

// Mock weekly analysis
const weeklyAnalysis = {
  period: "Feb 5 - Feb 11",
  patterns: [
    {
      type: "Perfectionist Loop",
      description:
        "You set unrealistically high standards on 5 out of 7 days. When results fell short, frustration spiked and productivity dropped the next day.",
      frequency: "5/7 days",
    },
    {
      type: "Morning Anxiety",
      description:
        "Negative emotions cluster in morning entries. By afternoon, your tone shifts to neutral or positive, suggesting recovery mechanisms are working.",
      frequency: "4/7 days",
    },
    {
      type: "Social Energy Drain",
      description:
        "Days with multiple meetings correlate with lower mood scores. Solitary work days show 2x higher satisfaction ratings.",
      frequency: "3/7 days",
    },
  ],
  summary:
    "This week showed a recurring pattern of high self-expectations followed by frustration. Your strongest days were when you had uninterrupted focus time. Consider blocking out at least 3 hours of solo work time each day.",
};

// Mock personality summary
const personalitySummary = {
  lastUpdated: "February 1, 2026",
  sections: [
    {
      title: "Core Tendencies",
      content:
        "You are a reflective, analytical thinker who processes emotions through logic. You tend to intellectualize feelings rather than sit with them, which provides clarity but can delay emotional processing.",
    },
    {
      title: "Strengths",
      content:
        "High self-awareness, ability to recognize patterns in your own behavior, strong recovery from setbacks within 24-48 hours, consistent journaling habit that provides valuable data points.",
    },
    {
      title: "Vulnerability Triggers",
      content:
        "Comparison with peers, perceived lack of progress, unclear expectations from others, back-to-back social engagements without recovery time.",
    },
    {
      title: "Recovery Patterns",
      content:
        "Morning exercise, solitary walks, writing (journaling itself), and small wins on concrete tasks. You recover fastest when you break large problems into smaller steps.",
    },
  ],
};

// Mock questioning mode
const questions = [
  {
    question:
      "You mentioned feeling 'stuck' three times this week. What specifically does 'stuck' feel like in your body?",
    context: "Pattern: Recurring frustration language",
  },
  {
    question:
      "Your mood drops consistently after team meetings. Is there a specific dynamic or person that triggers this?",
    context: "Pattern: Post-meeting mood decline",
  },
  {
    question:
      "You wrote 'I should be further along' on Monday and Thursday. Where does this timeline expectation come from?",
    context: "Pattern: Self-comparison",
  },
];

export function AnalysisPage() {
  const [activeQuestion, setActiveQuestion] = useState(0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Deep Insights
          </p>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-md">
            PRO
          </Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Analysis
        </h1>
      </div>

      <Tabs defaultValue="weekly" className="mb-8">
        <TabsList className="w-full bg-secondary rounded-xl p-1 h-auto">
          <TabsTrigger
            value="weekly"
            className="flex-1 rounded-lg text-xs py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            Weekly Report
          </TabsTrigger>
          <TabsTrigger
            value="personality"
            className="flex-1 rounded-lg text-xs py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            Personality
          </TabsTrigger>
          <TabsTrigger
            value="questions"
            className="flex-1 rounded-lg text-xs py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm"
          >
            Questions
          </TabsTrigger>
        </TabsList>

        {/* Weekly Report Tab */}
        <TabsContent value="weekly" className="mt-6">
          <div className="space-y-6">
            {/* Period Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Analysis Period</p>
                <p className="text-sm font-medium text-foreground">
                  {weeklyAnalysis.period}
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] rounded-md border-border"
              >
                Weekly
              </Badge>
            </div>

            {/* Detected Patterns */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Detected Patterns
              </h3>
              {weeklyAnalysis.patterns.map((pattern) => (
                <div
                  key={pattern.type}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {pattern.type}
                    </h4>
                    <span className="text-[10px] tabular-nums text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                      {pattern.frequency}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {pattern.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
                Weekly Summary
              </h3>
              <p className="text-sm text-foreground leading-relaxed">
                {weeklyAnalysis.summary}
              </p>
            </div>

            {/* Monthly Locked */}
            <div className="rounded-xl border border-dashed border-foreground/15 bg-secondary/30 p-5 flex items-center gap-4">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">
                  Monthly Deep Analysis
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Available on March 1. Requires 30 days of entries for
                  meaningful insights.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Personality Tab */}
        <TabsContent value="personality" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium text-foreground">
                  {personalitySummary.lastUpdated}
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] rounded-md border-border"
              >
                Monthly
              </Badge>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="relative bg-accent p-5 border-b border-border overflow-hidden">
                <div className="absolute -top-6 -right-6 opacity-30 pointer-events-none">
                  <RippleMotif size="md" />
                </div>
                <h3 className="relative text-sm font-semibold text-foreground mb-1">
                  Your Personal Summary
                </h3>
                <p className="relative text-xs text-muted-foreground">
                  Generated from 45 journal entries over 2 months
                </p>
              </div>

              <div className="divide-y divide-border">
                {personalitySummary.sections.map((section) => (
                  <div key={section.title} className="p-5">
                    <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                      {section.title}
                    </h4>
                    <p className="text-sm text-foreground leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Export */}
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Export as PDF
            </button>
          </div>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="mt-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                Reflection Questions
              </h3>
              <p className="text-xs text-muted-foreground">
                AI-generated questions based on your journal patterns. No need
                to answer here — just reflect.
              </p>
            </div>

            <div className="space-y-3">
              {questions.map((q, i) => (
                <button
                  key={q.question}
                  type="button"
                  onClick={() => setActiveQuestion(i)}
                  className={cn(
                    "w-full text-left rounded-xl border p-5 transition-all",
                    activeQuestion === i
                      ? "border-foreground bg-card"
                      : "border-border bg-card hover:border-foreground/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                        activeQuestion === i
                          ? "bg-foreground/15 text-foreground"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p
                        className={cn(
                          "text-sm leading-relaxed",
                          activeQuestion === i
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {q.question}
                      </p>
                      {activeQuestion === i && (
                        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {q.context}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <p className="text-xs text-muted-foreground mb-3">
                Questions refresh weekly with new journal data
              </p>
              <div className="flex items-center justify-center gap-1 text-xs font-medium text-foreground">
                Next refresh: February 17
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
