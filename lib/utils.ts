import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * クラス名を結合し、Tailwind の重複をマージする。
 * @param inputs - クラス名（文字列・配列・条件付きオブジェクトなど）
 * @returns マージ済みの className 文字列
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
