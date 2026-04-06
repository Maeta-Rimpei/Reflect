"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  PenLine,
  CalendarDays,
  BarChart3,
  Brain,
  Settings,
  Sparkles,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RippleMotif } from "@/components/ripple-motif";
import PageLoadingSkeleton from "@/components/page-loading-skeleton";
import { PLAN_DEEP } from "@/constants/plan";
import type { Plan } from "@/types/plan";

const navigation = [
  { name: "今日のふりかえり", shortName: "ふりかえり", href: "/journal", icon: PenLine },
  { name: "履歴", shortName: "履歴", href: "/history", icon: CalendarDays },
  { name: "感情ログ", shortName: "感情", href: "/emotions", icon: BarChart3 },
  { name: "Deep分析", shortName: "分析", href: "/analysis", icon: Brain, deep: true },
  { name: "設定", shortName: "設定", href: "/settings", icon: Settings },
];

export function AppShell({
  children,
  plan,
}: {
  children: React.ReactNode;
  /** サーバーで取得したプラン（各ページの Server Component で getPlan() 等から渡す） */
  plan: Plan;
}) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const mainContent = isNavigating ? <PageLoadingSkeleton /> : children;

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
          <ul className="flex flex-col gap-1.5" role="list">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setIsNavigating(true)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                      isActive
                        ? "bg-foreground/10 text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                    {item.deep && plan !== PLAN_DEEP && (
                      <Badge
                        variant="outline"
                        className="ml-auto text-[10px] px-1.5 py-0"
                      >
                        DEEP
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/" })}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors cursor-pointer",
            )}
          >
            <LogOut className="h-4 w-4" />
            <span>ログアウト</span>
          </button>
        </div>

        {plan !== PLAN_DEEP && (
          <div className="border-t border-border p-4">
            <div className="rounded-lg border border-border bg-secondary/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-foreground" />
                <span className="text-xs font-semibold text-foreground">
                  Deepプランにアップグレード
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Deep分析・人格サマリー・問いかけが使えます。
              </p>
              <Link
                href="/settings"
                className="block w-full rounded-md border border-foreground/20 bg-accent px-3 py-1.5 text-center text-xs font-medium text-foreground transition-colors hover:bg-foreground/10 cursor-pointer"
              >
                プランを見る
              </Link>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile: ヘッダー + メイン + 下部タブバー */}
      <div className="flex flex-1 flex-col overflow-hidden md:min-w-0">
        <header className="flex md:hidden h-12 shrink-0 items-center border-b border-border px-4 bg-card">
          <Link href="/" className="flex items-center gap-2">
            <RippleMotif size="sm" />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Reflect
            </span>
          </Link>
        </header>

        {/* Main Content（スマホ時はタブバー高さ分の余白を確保） */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{mainContent}</main>

        {/* Mobile Tab Bar */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-14 shrink-0 items-center justify-around border-t border-border bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80 pb-[env(safe-area-inset-bottom)]"
          aria-label="メインナビゲーション"
        >
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsNavigating(true)}
              className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 px-1 text-[10px] font-medium transition-colors cursor-pointer",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground active:bg-foreground/5"
                )}
              >
                <span className="relative inline-flex">
                  <item.icon
                    className={cn("h-5 w-5 shrink-0", isActive && "text-foreground")}
                    strokeWidth={isActive ? 2.25 : 1.75}
                  />
                  {item.deep && plan !== PLAN_DEEP && (
                    <span className="absolute -top-0.5 -right-1.5 h-1.5 w-1.5 rounded-full bg-foreground/50" />
                  )}
                </span>
                <span className="truncate w-full text-center">{item.shortName}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
