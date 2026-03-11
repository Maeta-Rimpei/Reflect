import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RippleMotif } from "@/components/ripple-motif";

export function LpFooter() {
  return (
    <footer>
      {/* Final CTA */}
      <section className="relative border-t border-border overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 pointer-events-none">
          <RippleMotif size="lg" className="!h-[500px] !w-[500px]" />
        </div>

        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center md:py-32">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-4xl text-balance">
            {"自分を知ることは、"}
            <br className="hidden md:block" />
            {"自分を変える第一歩。"}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            {"Reflect で、毎日の思考を静かに振り返る習慣を始めましょう。"}
          </p>
          <Link
            href="/journal"
            className="group mt-8 flex items-center gap-2 rounded-xl bg-foreground/30 px-8 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-foreground/75"
          >
            {"はじめる"}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <RippleMotif size="sm" />
            <span className="text-xs font-semibold text-foreground">
              Reflect
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
            <a
              href="#features"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Reflectについて
            </a>
            <a
              href="#pricing"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              料金
            </a>
            <a
              href="/privacy"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              プライバシーポリシー
            </a>
            <a
              href="/terms"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              利用規約
            </a>
            <a
              href="/tokushoho"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              特定商取引法に基づく表記
            </a>
          </nav>

          <p className="text-[11px] text-muted-foreground/50">
            {"© 2026 Reflect. All rights reserved."}
          </p>
        </div>
      </div>
    </footer>
  );
}
