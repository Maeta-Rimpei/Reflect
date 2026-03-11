"use client";

import React from "react";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PenLine,
  CalendarDays,
  BarChart3,
  Brain,
  Settings,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RippleMotif } from "@/components/ripple-motif";

const navigation = [
  { name: "Today", href: "/app", icon: PenLine },
  { name: "History", href: "/history", icon: CalendarDays },
  { name: "Emotions", href: "/emotions", icon: BarChart3 },
  { name: "Analysis", href: "/analysis", icon: Brain, pro: true },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-3">
            <RippleMotif size="sm" />
            <span className="text-base font-semibold tracking-tight text-foreground">
              Reflect
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4" aria-label="Main navigation">
          <ul className="flex flex-col gap-1" role="list">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                    {item.pro && (
                      <Badge
                        variant="outline"
                        className="ml-auto text-[10px] px-1.5 py-0"
                      >
                        PRO
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-4">
          <div className="rounded-lg border border-border bg-secondary/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-foreground" />
              <span className="text-xs font-semibold text-foreground">
                Upgrade to Pro
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Unlock deep analysis, personality summaries, and more.
            </p>
            <Link
              href="/settings"
              className="block w-full rounded-md border border-foreground/20 bg-accent px-3 py-1.5 text-center text-xs font-medium text-foreground transition-colors hover:bg-foreground/10"
            >
              View Plans
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex md:hidden h-14 items-center justify-between border-b border-border px-4 bg-card">
          <Link href="/" className="flex items-center gap-3">
            <RippleMotif size="sm" />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Reflect
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute inset-0 z-50 bg-background/95 backdrop-blur-sm">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <Link href="/" className="flex items-center gap-3">
                <RippleMotif size="sm" />
                <span className="text-sm font-semibold tracking-tight text-foreground">
                  Reflect
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-accent"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-4" aria-label="Mobile navigation">
              <ul className="flex flex-col gap-1" role="list">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-accent text-foreground"
                            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                        {item.pro && (
                          <Badge
                            variant="outline"
                            className="ml-auto text-[10px] px-1.5 py-0"
                          >
                            PRO
                          </Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
