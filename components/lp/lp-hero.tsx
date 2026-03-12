import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RippleMotif } from "@/components/ripple-motif";

export function LpHero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 pt-14">
      {/* Large ripple background */}
      <div className="absolute inset-0 -top-[100px] -right-[150px] md:-right-[300px] flex items-center justify-center pointer-events-none">
        <div className="relative h-[500px] w-[500px] md:h-[700px] md:w-[700px] opacity-60">
          <RippleMotif size="lg" className="!h-full !w-full" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
        <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Self Reflection Tool
        </p>

        <h1 className="text-4xl font-semibold leading-snug tracking-tight text-foreground md:text-6xl text-balance">
          迷いを書き、<br/>
          自分が見える。<br/>
          そして次の一歩を。<br/>
        </h1>

        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
        Reflectは思考と感情を整理し、あなたの「強み」と「傾向」を見つけるための場所。<br/>自分を知る習慣を、ここから。
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/journal"
            className="group flex items-center gap-2 rounded-xl bg-foreground/30 px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-foreground/75"
          >
            {"はじめる"}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#features"
            className="rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {"Reflectとは"}
          </a>
        </div>
      </div>
    </section>
  );
}
