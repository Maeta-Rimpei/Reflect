"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RippleMotif } from "@/components/ripple-motif";

const moodOptions = [
  { value: "great", label: "Great", icon: "+" },
  { value: "good", label: "Good", icon: "/" },
  { value: "neutral", label: "Neutral", icon: "-" },
  { value: "low", label: "Low", icon: "\\" },
  { value: "bad", label: "Bad", icon: "x" },
];

const MAX_CHARS = 800;

// Mock recent analysis result
const recentAnalysis = {
  emotionTags: ["Anxious", "Hopeful", "Restless"],
  thinkingType: "Perfectionist tendency",
  comment:
    "You tend to set high standards and feel frustrated when results don't match expectations. This pattern has appeared 4 times in the last 7 days.",
};

// Mock streak data
const streakDays = 12;
const weekDays = [
  { day: "Mon", done: true },
  { day: "Tue", done: true },
  { day: "Wed", done: true },
  { day: "Thu", done: true },
  { day: "Fri", done: true },
  { day: "Sat", done: false },
  { day: "Sun", done: false, today: true },
];

export function DiaryPage() {
  const [text, setText] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const charCount = text.length;
  const charPercentage = (charCount / MAX_CHARS) * 100;

  const handleSave = () => {
    if (text.trim() && selectedMood) {
      setIsSaved(true);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
      {/* Hero with Ripple */}
      <div className="relative mb-10 flex flex-col items-center text-center py-4">
        <RippleMotif size="lg" className="mb-6" />
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground mb-2">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
          {"Today's Reflection"}
        </h1>
      </div>

      {/* Streak */}
      <div className="mb-8 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Current Streak</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {streakDays}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                days
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {weekDays.map((d) => (
              <div key={d.day} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">
                  {d.day}
                </span>
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors",
                    d.done
                      ? "bg-foreground/15 text-foreground"
                      : d.today
                        ? "border border-foreground/40 text-foreground"
                        : "bg-secondary text-muted-foreground"
                  )}
                >
                  {d.done ? "o" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!isSaved ? (
        <>
          {/* Mood Selection */}
          <div className="mb-6">
            <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
              How are you feeling?
            </label>
            <div className="flex gap-2">
              {moodOptions.map((mood) => (
                <button
                  key={mood.value}
                  type="button"
                  onClick={() => setSelectedMood(mood.value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 transition-all",
                    selectedMood === mood.value
                      ? "border-foreground/40 bg-foreground/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                  )}
                >
                  <span className="text-lg font-mono">{mood.icon}</span>
                  <span className="text-[10px] font-medium">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Text Input */}
          <div className="mb-6">
            <label
              htmlFor="diary-input"
              className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3"
            >
              {"What's on your mind?"}
            </label>
            <div className="relative">
              <textarea
                id="diary-input"
                value={text}
                onChange={(e) =>
                  setText(e.target.value.slice(0, MAX_CHARS))
                }
                placeholder="Write about your day, thoughts, feelings..."
                className="w-full min-h-[200px] resize-none rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-shadow"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    charPercentage > 90
                      ? "text-destructive"
                      : "text-muted-foreground"
                  )}
                >
                  {charCount}/{MAX_CHARS}
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!text.trim() || !selectedMood}
            className={cn(
              "w-full rounded-xl py-3 text-sm font-medium transition-all",
              text.trim() && selectedMood
                ? "bg-foreground/90 text-primary-foreground hover:bg-foreground/75"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            Save Entry
          </button>
        </>
      ) : (
        /* Analysis Result */
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 relative overflow-hidden">
            {/* Decorative ripple in corner */}
            <div className="absolute -top-10 -right-10 opacity-40 pointer-events-none">
              <RippleMotif size="md" />
            </div>
            <div className="relative flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">
                AI Quick Analysis
              </h2>
              <Badge variant="secondary" className="text-[10px]">
                Free
              </Badge>
            </div>

            {/* Emotion Tags */}
            <div className="mb-5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
                Detected Emotions
              </p>
              <div className="flex gap-2">
                {recentAnalysis.emotionTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="rounded-lg border-foreground/20 text-foreground text-xs px-3 py-1"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Thinking Type */}
            <div className="mb-5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
                Thinking Pattern
              </p>
              <p className="text-sm font-medium text-foreground">
                {recentAnalysis.thinkingType}
              </p>
            </div>

            {/* Comment */}
            <div className="border-t border-border pt-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {recentAnalysis.comment}
              </p>
            </div>
          </div>

          {/* Pro Upsell */}
          <div className="rounded-xl border border-dashed border-foreground/20 bg-secondary/30 p-6 text-center">
            <p className="text-xs font-semibold text-foreground mb-1">
              Want deeper insights?
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Pro unlocks weekly pattern analysis, personality summaries, and
              personalized questions.
            </p>
            <button
              type="button"
              className="rounded-lg border border-foreground/20 bg-foreground/10 px-6 py-2 text-xs font-medium text-foreground transition-colors hover:bg-foreground/15"
            >
              Explore Pro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
