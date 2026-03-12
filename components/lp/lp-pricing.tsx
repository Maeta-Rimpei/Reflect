import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: "0",
    description: "まずは気軽に始める",
    features: [
      "1日1件のふりかえり記録",
      "気分の選択・保存",
      "簡易分析",
      "直近7日分の履歴・感情ログ",
    ],
    cta: "はじめる",
    highlighted: false,
  },
  {
    name: "Deep",
    price: "980",
    period: "/月",
    description: "本格的な自己分析を",
    features: [
      "1日1件のふりかえり記録",
      "全期間の履歴閲覧",
      "週次分析レポート",
      "月次分析レポート",
      "年次分析レポート",
      "人格サマリー",
      "思考を深掘る問いかけ",
    ],
    cta: "はじめる",
    highlighted: true,
  },
];

export function LpPricing() {
  return (
    <section id="pricing" className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Pricing
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl text-balance">
            {"あなたのペースに合わせたプラン。"}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {"Freeプランはずっと無料。Deepプランへいつでも切り替え可能。"}
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col rounded-2xl border p-8",
                plan.highlighted
                  ? "border-foreground/20 bg-card"
                  : "border-border bg-card"
              )}
            >
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {plan.name}
                  </h3>
                  {plan.highlighted && (
                    <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      おすすめ
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs text-muted-foreground">{"\u00A5"}</span>
                  <span className="text-3xl font-semibold tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-xs text-muted-foreground">
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <ul className="mb-8 flex flex-col gap-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-foreground/80"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/40" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/journal"
                className={cn(
                  "mt-auto rounded-xl py-3 text-center text-sm font-medium transition-colors",
                  plan.highlighted
                    ? "bg-foreground/30 text-primary-foreground hover:bg-foreground/75"
                    : "border border-border bg-card text-foreground hover:bg-accent"
                )}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
