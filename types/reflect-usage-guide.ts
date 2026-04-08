import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** ガイドスライドの見出し＋本文ブロック */
export interface SlideBlockProps {
  title: string;
  titleBadge?: string;
  children: ReactNode;
}

/** ガイド用スライド画像（縦長 3:4 枠） */
export interface SlideImageProps {
  src: string | undefined;
  alt: string;
  index: number;
}

/** ガイド用 1 スライド行（画像 + アイコン・本文） */
export interface GuideSlideRowProps {
  index: number;
  imageSrc: string | undefined;
  Icon: LucideIcon;
  title: string;
  titleBadge?: string;
  children: ReactNode;
}
