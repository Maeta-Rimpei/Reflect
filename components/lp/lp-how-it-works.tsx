import { RippleMotif } from "@/components/ripple-motif";

const steps = [
  {
    number: "01",
    title: "Write",
    description: "その日の気分を選んで、頭に浮かんだことを自由に書く。1分でも、10分でも。",
  },
  {
    number: "02",
    title: "Analyze",
    description: "感情、思考タイプ、パターンを分析。書くたびに精度が向上。",
  },
  {
    number: "03",
    title: "Discover",
    description: "週次・月次・年次のレポートで、自分の感情の波と思考の癖を俯瞰的に把握。",
  },
];

export function LpHowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative border-y border-border bg-accent/40 py-24 md:py-32 overflow-hidden"
    >
      {/* Background ripple */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 opacity-30 pointer-events-none">
        <RippleMotif size="lg" className="!h-[400px] !w-[400px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6">
        <div className="mb-16 max-w-lg">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
            How it works
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl text-balance">
            {"3つのステップで、自己理解が始まる。"}
          </h2>
        </div>

        <div className="grid gap-12 md:grid-cols-3 md:gap-8">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col">
              <span className="mb-4 text-3xl font-light tracking-tight text-foreground/15 md:text-4xl">
                {step.number}
              </span>
              <h3 className="mb-2 text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
