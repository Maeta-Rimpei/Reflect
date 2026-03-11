"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Mock data for the calendar
const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

interface EntryData {
  date: number;
  mood: string;
  preview: string;
  emotionTags: string[];
}

const mockEntries: EntryData[] = [
  {
    date: 5,
    mood: "good",
    preview:
      "Had a productive meeting with the team. Felt energized about the new project direction...",
    emotionTags: ["Confident", "Energized"],
  },
  {
    date: 6,
    mood: "neutral",
    preview:
      "Regular day at work. Nothing particularly exciting but nothing bad either. Spent time organizing...",
    emotionTags: ["Calm", "Neutral"],
  },
  {
    date: 7,
    mood: "low",
    preview:
      "Struggled with motivation today. The project feels overwhelming and I can't seem to find a starting point...",
    emotionTags: ["Anxious", "Overwhelmed"],
  },
  {
    date: 8,
    mood: "great",
    preview:
      "Breakthrough moment! Finally figured out the approach for the main feature. Everything clicked...",
    emotionTags: ["Excited", "Accomplished"],
  },
  {
    date: 9,
    mood: "good",
    preview:
      "Quiet Saturday morning. Went for a run and spent time reading. Feeling at peace...",
    emotionTags: ["Peaceful", "Content"],
  },
  {
    date: 10,
    mood: "neutral",
    preview:
      "Thinking about next week's presentation. Preparing notes and going through the material...",
    emotionTags: ["Focused", "Nervous"],
  },
  {
    date: 11,
    mood: "good",
    preview:
      "A productive start to the week. Set clear goals and tackled the hardest task first...",
    emotionTags: ["Determined", "Hopeful"],
  },
];

const moodColor: Record<string, string> = {
  great: "bg-foreground/70",
  good: "bg-foreground/50",
  neutral: "bg-foreground/30",
  low: "bg-foreground/20",
  bad: "bg-foreground/10",
};

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(month: number, year: number) {
  return new Date(year, month, 1).getDay();
}

export function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [viewYear, setViewYear] = useState(currentYear);

  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear);

  const entryDates = new Set(mockEntries.map((e) => e.date));

  const selectedEntry = mockEntries.find((e) => e.date === selectedDate);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
          Journal
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          History
        </h1>
      </div>

      {/* Calendar */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-foreground">{monthName}</h2>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-medium text-muted-foreground py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const hasEntry = entryDates.has(day);
            const isToday =
              day === today.getDate() &&
              viewMonth === currentMonth &&
              viewYear === currentYear;
            const isSelected = day === selectedDate;
            const entry = mockEntries.find((e) => e.date === day);

            return (
              <button
                key={day}
                type="button"
                onClick={() => hasEntry && setSelectedDate(day)}
                className={cn(
                  "aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all relative",
                  isSelected
                    ? "bg-foreground/15 text-foreground font-semibold"
                    : isToday
                      ? "border border-foreground text-foreground"
                      : hasEntry
                        ? "hover:bg-accent text-foreground cursor-pointer"
                        : "text-muted-foreground/40 cursor-default"
                )}
                disabled={!hasEntry}
              >
                <span className="font-medium">{day}</span>
                {hasEntry && !isSelected && entry && (
                  <div
                    className={cn(
                      "absolute bottom-1 h-1 w-1 rounded-full",
                      moodColor[entry.mood]
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Entry Detail */}
      {selectedEntry ? (
        <div className="rounded-xl border border-border bg-card p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground">
                {new Date(viewYear, viewMonth, selectedEntry.date).toLocaleDateString(
                  "en-US",
                  { weekday: "long", month: "short", day: "numeric" }
                )}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    moodColor[selectedEntry.mood]
                  )}
                />
                <span className="text-xs font-medium capitalize text-foreground">
                  {selectedEntry.mood}
                </span>
              </div>
            </div>
            <div className="flex gap-1.5">
              {selectedEntry.emotionTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-[10px] px-2 py-0 rounded-md"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {selectedEntry.preview}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Select a date to view your journal entry
          </p>
        </div>
      )}

      {/* Older Entries Note (Free Limitation) */}
      <div className="mt-6 rounded-xl border border-dashed border-foreground/15 bg-secondary/30 p-5 flex items-center gap-4">
        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <p className="text-xs font-medium text-foreground">
            Viewing last 7 days
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upgrade to Pro to access your complete journal history.
          </p>
        </div>
      </div>
    </div>
  );
}
