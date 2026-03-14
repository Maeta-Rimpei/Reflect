/**
 * サイドメニュー遷移時の共通ローディング表示。
 */
export default function PageLoadingSkeleton() {
  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12 animate-pulse">
        <div className="h-6 w-40 rounded bg-foreground/10 mb-6" />
        <div className="h-4 w-full rounded bg-foreground/10 mb-2" />
        <div className="h-4 max-w-[70%] rounded bg-foreground/10 mb-8" />
        <div className="h-36 rounded-xl bg-foreground/10 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-foreground/10" />
          ))}
        </div>
      </div>
    </div>
  );
}
