"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CalendarRange,
  MessageCircleQuestion,
  UserRound,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  GuideSlideRowProps,
  SlideBlockProps,
  SlideImageProps,
} from "@/types/reflect-usage-guide";

/** 各スライドの画像（縦長 3:4 推奨）。`public/reflect-guide/01.png` を置きパスを指定（未設定時はプレースホルダー） */
export const REFLECT_USAGE_GUIDE_IMAGES: (string | undefined)[] = [
  "/reflect-guide/01.png", // 1. 日々のふりかえり → "/reflect-guide/01.png"
  "/reflect-guide/02.png", // 2. 日次分析
  "/reflect-guide/03.png", // 3. 1週間
  "/reflect-guide/04.png", // 4. 月次
  "/reflect-guide/05.png", // 5. 人格サマリー
  "/reflect-guide/06.png", // 6. 問いかけ
];

function SlideBlock({ title, titleBadge, children }: SlideBlockProps) {
  return (
    <div className="min-h-0 space-y-1.5 px-1">
      <h3 className="text-sm font-medium leading-snug text-foreground">
        {title}
        {titleBadge ? (
          <span className="ml-1.5 align-baseline text-xs font-normal text-muted-foreground">
            {titleBadge}
          </span>
        ) : null}
      </h3>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

function SlideImage({ src, alt, index }: SlideImageProps) {
  const n = String(index + 1).padStart(2, "0");
  /** 縦長 3:4。枠いっぱいに object-cover（天地は中央寄せ） */
  const imageFrame =
    "relative w-full h-full aspect-[11/12] overflow-hidden rounded-xl border border-border/40 bg-muted shadow-sm ring-1 ring-border/10";
  if (!src) {
    return (
      <div
        className={`flex ${imageFrame} flex-col items-center justify-center gap-1 border-dashed border-border/80 bg-muted/40 px-2 py-3 text-center`}
      >
          public/reflect-guide/{n}.png
      </div>
    );
  }
  return (
    <div className={imageFrame}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain object-center"
        sizes="(max-width: 768px) 72vw, 240px"
        priority={index === 0}
      />
    </div>
  );
}

/** モバイル: 画像→本文の縦並び。md+: 画像左・本文右で縦長スペースを活かす */
function GuideSlideRow({
  index,
  imageSrc,
  Icon,
  title,
  titleBadge,
  children,
}: GuideSlideRowProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
      <aside className="mx-auto flex w-full max-w-[220px] shrink-0 justify-center md:mx-0 md:w-[min(280px, 50%)] md:max-w-[280px] md:justify-start">
        <SlideImage src={imageSrc} alt="" index={index} />
      </aside>
      <div className="min-w-0 flex-1 md:pt-0.5">
        <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/50 text-muted-foreground">
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
          <SlideBlock title={title} titleBadge={titleBadge}>
            {children}
          </SlideBlock>
        </div>
      </div>
    </div>
  );
}

export function ReflectUsageGuide() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const slideCount = REFLECT_USAGE_GUIDE_IMAGES.length;

  const onSelect = useCallback((carousel: CarouselApi) => {
    if (!carousel) return;
    setCurrent(carousel.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  return (
    <div className="mb-6 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[13px] text-muted-foreground">
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 text-left text-muted-foreground underline-offset-2 hover:underline"
          >
            <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground/90" aria-hidden />
            Reflect の使い方
          </button>
        </DialogTrigger>
        <DialogContent className="flex min-h-0 max-h-[min(96vh,960px)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <div className="shrink-0 border-b border-border/50 px-5 pb-2.5 pt-3 pr-12">
            <DialogHeader className="p-0 text-left">
              <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-x-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/60 text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden />
                </span>
                <DialogTitle className="text-left text-sm font-semibold leading-tight tracking-tight text-foreground">
                  Reflect の使い方
                </DialogTitle>
              </div>
            </DialogHeader>
          </div>

          {/* スライドのみスクロール。ナビは常に下端に固定して切れないようにする */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-3">
            <Carousel
              setApi={setApi}
              opts={{ align: "start", loop: false }}
              className="w-full"
            >
              <CarouselContent className="ml-0">
                <CarouselItem key="slide-1" className="basis-full pl-0">
                  <GuideSlideRow
                    index={0}
                    imageSrc={REFLECT_USAGE_GUIDE_IMAGES[0]}
                    Icon={BookOpen}
                    title="日々のふりかえり"
                  >
                    <p>
                      気分を選び、その日にその気持ちになった出来事と、なぜそう感じたかを書きます。書き方のコツは、
                      <Link
                        href="/journal"
                        className="text-foreground underline underline-offset-2 hover:text-foreground/80"
                      >
                        ふりかえり
                      </Link>
                      画面の入力ガイドも参照してください。
                    </p>
                  </GuideSlideRow>
                </CarouselItem>

                <CarouselItem key="slide-2" className="basis-full">
                  <GuideSlideRow
                    index={1}
                    imageSrc={REFLECT_USAGE_GUIDE_IMAGES[1]}
                    Icon={BarChart3}
                    title="日次分析と問いかけ"
                  >
                    <p>
                      保存すると、その日の出来事の分析が表示されます。出てきた問いかけについて、少し考えてみましょう。
                    </p>
                  </GuideSlideRow>
                </CarouselItem>

                <CarouselItem key="slide-3" className="basis-full">
                  <GuideSlideRow
                    index={2}
                    imageSrc={REFLECT_USAGE_GUIDE_IMAGES[2]}
                    Icon={CalendarDays}
                    title="1週間の継続"
                  >
                    <p>
                      毎日続けます。Deepプランでは、週の最終日に週次分析が行われ、週次レポートでその週の傾向がわかります。その結果を手がかりに、その週の自分をふりかえりましょう。
                    </p>
                  </GuideSlideRow>
                </CarouselItem>

                <CarouselItem key="slide-4" className="basis-full">
                  <GuideSlideRow
                    index={3}
                    imageSrc={REFLECT_USAGE_GUIDE_IMAGES[3]}
                    Icon={CalendarRange}
                    title="月次の振り返り"
                    titleBadge="（Deepプラン）"
                  >
                    <p>
                      1か月分がたまると月次分析ができます。その月の自分をふりかえりましょう。
                    </p>
                  </GuideSlideRow>
                </CarouselItem>

                <CarouselItem key="slide-5" className="basis-full">
                  <GuideSlideRow
                    index={4}
                    imageSrc={REFLECT_USAGE_GUIDE_IMAGES[4]}
                    Icon={UserRound}
                    title="人格サマリー"
                    titleBadge="（Deepプラン）"
                  >
                    <p>
                      ある程度データが蓄積された後に、人格サマリーを生成してみてください。自身の言動と感情のまとめ、強み、リスク、落ち込みやすい条件、回復しやすい行動などを俯瞰できます。
                    </p>
                  </GuideSlideRow>
                </CarouselItem>

                <CarouselItem key="slide-6" className="basis-full">
                  <GuideSlideRow
                    index={5}
                    imageSrc={REFLECT_USAGE_GUIDE_IMAGES[5]}
                    Icon={MessageCircleQuestion}
                    title="問いかけと次の一歩"
                    titleBadge="（Deepプラン）"
                  >
                    <p>
                      人格サマリーと同時に、次の一歩を踏み出すための問いかけが生成されることがあります。問いかけについて考え、実践できるものは試してみてください。
                    </p>
                  </GuideSlideRow>
                </CarouselItem>
              </CarouselContent>
            </Carousel>
            </div>

            <div className="shrink-0 border-t border-border/40 bg-background px-5 pb-4 pt-3">
              <div className="flex items-center justify-center gap-1.5" aria-hidden>
                {Array.from({ length: slideCount }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => api?.scrollTo(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === current
                        ? "w-5 bg-foreground"
                        : "w-1.5 border border-border bg-muted-foreground/35 hover:bg-muted-foreground/55",
                    )}
                    aria-label={`スライド ${i + 1} へ`}
                  />
                ))}
              </div>
              <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full min-w-0 justify-center sm:min-w-20"
                  disabled={!api?.canScrollPrev()}
                  onClick={() => api?.scrollPrev()}
                >
                  前へ
                </Button>
                <span className="shrink-0 text-center text-xs tabular-nums text-muted-foreground">
                  {current + 1} / {slideCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full min-w-0 justify-center sm:min-w-20"
                  disabled={!api?.canScrollNext()}
                  onClick={() => api?.scrollNext()}
                >
                  次へ
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
