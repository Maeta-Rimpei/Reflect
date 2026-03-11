"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const screens = [
  {
    label: "Journal",
    content: {
      mood: "Good",
      date: "February 11, 2026",
      entry:
        "Today I had a productive meeting with the team. Felt energized about the new project direction. Need to think more about...",
      tags: ["Motivated", "Focused", "Hopeful"],
      type: "Analytical Thinking",
    },
  },
  {
    label: "Analysis",
    content: {
      mood: "Weekly Insight",
      date: "Feb 5 - Feb 11",
      entry:
        "Your entries this week show a clear shift toward action-oriented language. Compared to last week, positive sentiment increased by 23%.",
      tags: ["Growth Pattern", "Consistency", "Self-awareness"],
      type: "Cognitive Reframing",
    },
  },
  {
    label: "Emotions",
    content: {
      mood: "Trend",
      date: "Last 30 days",
      entry:
        "Dominant emotion: Calm confidence. Peak positivity on weekday mornings. Notable pattern: creativity spikes after journaling sessions.",
      tags: ["Calm", "Confident", "Creative"],
      type: "Emotional Intelligence",
    },
  },
];

export function LpPreview() {
  const [activeScreen, setActiveScreen] = useState(0);
  const screen = screens[activeScreen];

  return (
    <section className="pb-16 md:pb-24">
      <div className="mx-auto max-w-5xl px-6">
        {/* Screen toggle */}
        <div className="mb-8 flex items-center justify-center gap-1">
          {screens.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setActiveScreen(i)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-xs font-medium transition-colors",
                activeScreen === i
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Mock app window */}
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
                <div className="h-2.5 w-2.5 rounded-full bg-border" />
              </div>
              <div className="ml-4 flex-1">
                <div className="mx-auto max-w-[200px] rounded-md bg-secondary/60 px-3 py-1 text-center text-[10px] text-muted-foreground">
                  reflect.app
                </div>
              </div>
            </div>

            {/* Screen content */}
            <div className="p-8 md:p-12">
              <div className="flex items-center gap-3 mb-2">
                <span className="rounded-md bg-accent px-2.5 py-1 text-[10px] font-medium text-foreground">
                  {screen.content.mood}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {screen.content.date}
                </span>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-foreground/80 max-w-lg">
                {screen.content.entry}
              </p>

              {/* Tags */}
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {screen.content.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Thinking type */}
              <div className="mt-5 flex items-center gap-2 text-[11px] text-muted-foreground/60">
                <div className="h-px flex-1 bg-border" />
                <span>{screen.content.type}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
