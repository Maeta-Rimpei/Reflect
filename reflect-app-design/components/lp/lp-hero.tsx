import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RippleMotif } from "@/components/ripple-motif";

export function LpHero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 pt-14">
      {/* Large ripple background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative h-[500px] w-[500px] md:h-[700px] md:w-[700px] opacity-60">
          <RippleMotif size="lg" className="!h-full !w-full" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
        <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
          AI-Powered Self Analysis
        </p>

        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl md:leading-[1.1] text-balance">
          {"Think. Write."}
          <br />
          <span className="text-muted-foreground">Understand yourself.</span>
        </h1>

        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
          {"日々の思考を言葉にするだけで、AIがあなたの感情パターンと思考傾向を静かに分析。自分を知る習慣を、ここから。"}
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/app"
            className="group flex items-center gap-2 rounded-xl bg-foreground/90 px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-foreground/75"
          >
            {"Start Reflecting"}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#features"
            className="rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {"Learn More"}
          </a>
        </div>

        <p className="mt-5 text-[11px] text-muted-foreground/60">
          {"Free plan available. No credit card required."}
        </p>
      </div>
    </section>
  );
}
