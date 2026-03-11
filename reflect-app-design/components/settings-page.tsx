"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Check, ArrowRight } from "lucide-react";

const freePlan = {
  name: "Free",
  price: "0",
  features: [
    "1 journal entry per day",
    "AI quick analysis (3 tags + 1 comment)",
    "7-day history",
    "Basic emotion log",
    "500-800 character limit",
  ],
};

const proPlan = {
  name: "Pro",
  price: "980",
  features: [
    "Unlimited entries per day",
    "No character limit",
    "Full history access",
    "Weekly deep analysis",
    "Monthly personality summary",
    "Emotion trend graphs",
    "AI questioning mode",
    "PDF export",
    "Annual report (coming soon)",
  ],
};

export function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">("free");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
          Account
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
          Profile
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-foreground font-semibold text-lg">
            Y
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              user@example.com
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 rounded-md"
              >
                Free Plan
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                Joined January 2026
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
          Notifications
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Push Notifications
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receive reminders and updates
              </p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Daily Reminder
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Remind to write at 21:00
              </p>
            </div>
            <Switch
              checked={dailyReminder}
              onCheckedChange={setDailyReminder}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  Weekly Report
                </p>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 rounded-md"
                >
                  PRO
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Email weekly analysis summary
              </p>
            </div>
            <Switch
              checked={weeklyReport}
              onCheckedChange={setWeeklyReport}
              disabled
            />
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="mb-6">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
          Plan
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Free Plan */}
          <button
            type="button"
            onClick={() => setSelectedPlan("free")}
            className={cn(
              "text-left rounded-xl border p-5 transition-all",
              selectedPlan === "free"
                ? "border-foreground bg-card"
                : "border-border bg-card hover:border-foreground/30"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                {freePlan.name}
              </h3>
              {selectedPlan === "free" && (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/15">
                  <Check className="h-3 w-3 text-foreground" />
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground mb-4">
              {freePlan.price}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                yen/mo
              </span>
            </p>
            <ul className="space-y-2">
              {freePlan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <Check className="h-3 w-3 mt-0.5 shrink-0 text-foreground/40" />
                  {feature}
                </li>
              ))}
            </ul>
          </button>

          {/* Pro Plan */}
          <button
            type="button"
            onClick={() => setSelectedPlan("pro")}
            className={cn(
              "text-left rounded-xl border p-5 transition-all relative overflow-hidden",
              selectedPlan === "pro"
                ? "border-foreground bg-card"
                : "border-border bg-card hover:border-foreground/30"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                {proPlan.name}
              </h3>
              {selectedPlan === "pro" ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/15">
                  <Check className="h-3 w-3 text-foreground" />
                </div>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-md text-foreground">
                  Recommended
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground mb-4">
              {proPlan.price}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                yen/mo
              </span>
            </p>
            <ul className="space-y-2">
              {proPlan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <Check className="h-3 w-3 mt-0.5 shrink-0 text-foreground/60" />
                  {feature}
                </li>
              ))}
            </ul>
          </button>
        </div>

        {selectedPlan === "pro" && (
          <button
            type="button"
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-foreground/90 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-foreground/75"
          >
            Upgrade to Pro
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Data & Privacy */}
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
          Data & Privacy
        </h2>
        <div className="space-y-3">
          <button
            type="button"
            className="w-full flex items-center justify-between py-2 text-sm text-foreground hover:text-foreground/70 transition-colors"
          >
            Export All Data
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <Separator />
          <button
            type="button"
            className="w-full flex items-center justify-between py-2 text-sm text-foreground hover:text-foreground/70 transition-colors"
          >
            Privacy Policy
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <Separator />
          <button
            type="button"
            className="w-full flex items-center justify-between py-2 text-sm text-destructive hover:text-destructive/70 transition-colors"
          >
            Delete Account
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-[10px] text-muted-foreground">
          Reflect v1.0.0
        </p>
      </div>
    </div>
  );
}
