"use client";

import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock emotion data (7 days)
const emotionLog = [
  {
    date: "Feb 11",
    day: "Tue",
    tags: ["Determined", "Hopeful"],
    mood: "good",
    level: 70,
  },
  {
    date: "Feb 10",
    day: "Mon",
    tags: ["Focused", "Nervous"],
    mood: "neutral",
    level: 50,
  },
  {
    date: "Feb 9",
    day: "Sun",
    tags: ["Peaceful", "Content"],
    mood: "good",
    level: 65,
  },
  {
    date: "Feb 8",
    day: "Sat",
    tags: ["Excited", "Accomplished"],
    mood: "great",
    level: 85,
  },
  {
    date: "Feb 7",
    day: "Fri",
    tags: ["Anxious", "Overwhelmed"],
    mood: "low",
    level: 25,
  },
  {
    date: "Feb 6",
    day: "Thu",
    tags: ["Calm", "Neutral"],
    mood: "neutral",
    level: 50,
  },
  {
    date: "Feb 5",
    day: "Wed",
    tags: ["Confident", "Energized"],
    mood: "good",
    level: 72,
  },
];

const tagFrequency = [
  { tag: "Anxious", count: 4, percentage: 57 },
  { tag: "Hopeful", count: 3, percentage: 43 },
  { tag: "Focused", count: 3, percentage: 43 },
  { tag: "Overwhelmed", count: 2, percentage: 29 },
  { tag: "Confident", count: 2, percentage: 29 },
  { tag: "Calm", count: 1, percentage: 14 },
];

export function EmotionsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
          Tracking
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Emotion Log
        </h1>
      </div>

      {/* Mini bar chart (last 7 days) */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
          Mood Trend (7 Days)
        </h2>
        <div className="flex items-end justify-between gap-2 h-24">
          {emotionLog
            .slice()
            .reverse()
            .map((entry) => (
              <div
                key={entry.date}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <div className="w-full flex items-end justify-center h-20">
                  <div
                    className="w-full max-w-[32px] rounded-t-md bg-foreground/30 transition-all"
                    style={{ height: `${entry.level}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">
                  {entry.day}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Tag Frequency */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
          Top Emotions (7 Days)
        </h2>
        <div className="space-y-3">
          {tagFrequency.map((item) => (
            <div key={item.tag} className="flex items-center gap-3">
              <span className="text-xs font-medium text-foreground w-24 shrink-0">
                {item.tag}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground/35 transition-all"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">
                {item.count}x
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
          Daily Log
        </h2>
        <div className="space-y-0">
          {emotionLog.map((entry, i) => (
            <div
              key={entry.date}
              className={cn(
                "flex items-start gap-4 py-3",
                i !== emotionLog.length - 1 && "border-b border-border"
              )}
            >
              {/* Date */}
              <div className="w-16 shrink-0">
                <p className="text-xs font-medium text-foreground">
                  {entry.date}
                </p>
                <p className="text-[10px] text-muted-foreground">{entry.day}</p>
              </div>

              {/* Level indicator */}
              <div className="flex items-center pt-1">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    entry.mood === "great" && "bg-foreground/70",
                    entry.mood === "good" && "bg-foreground/50",
                    entry.mood === "neutral" && "bg-foreground/30",
                    entry.mood === "low" && "bg-foreground/20",
                    entry.mood === "bad" && "bg-foreground/10"
                  )}
                />
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {entry.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] px-2 py-0 rounded-md border-border"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pro Upsell for Graph */}
      <div className="rounded-xl border border-dashed border-foreground/15 bg-secondary/30 p-5 flex items-center gap-4">
        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <p className="text-xs font-medium text-foreground">
            Full Emotion Graph
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pro users get interactive weekly/monthly/yearly emotion trend graphs
            with pattern detection.
          </p>
        </div>
      </div>
    </div>
  );
}
