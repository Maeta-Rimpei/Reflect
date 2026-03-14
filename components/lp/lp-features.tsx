import { PenLine, BarChart3, Brain, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: PenLine,
    title: "Daily Journaling",
    description:
      "5段階の感情選択とフリーテキストで、その日の思考を素早く記録。続けやすさを最優先に設計。",
  },
  {
    icon: BarChart3,
    title: "Emotion Tracking",
    description:
      "記録した感情をタイムラインとチャートで可視化。自分のパターンが、データとして見えてくる。",
  },
  {
    icon: Brain,
    title: "Analysis",
    description:
      "週次・月次・年次で思考傾向を分析し、レポートを生成。今まで気づかなかった自分の傾向を発見。",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    description:
      "あなたの日記データは暗号化して保存。第三者と共有されることは一切ありません。",
  },
];

export function LpFeatures() {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        {/* Section header */}
        <div className="mb-16">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Features
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {"シンプルな記録が、深い自己理解に変わる。"}
          </h2>
        </div>

        {/* Feature grid */}
        <div className="grid gap-px rounded-2xl border border-border bg-border md:grid-cols-2">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={cn(
                "flex flex-col gap-4 bg-card p-8 md:p-10",
                i === 0 && "rounded-t-2xl md:rounded-tl-2xl md:rounded-tr-none",
                i === 1 && "md:rounded-tr-2xl",
                i === 2 && "md:rounded-bl-2xl",
                i === 3 && "rounded-b-2xl md:rounded-br-2xl md:rounded-bl-none"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                <feature.icon className="h-4.5 w-4.5 text-foreground/70" />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
