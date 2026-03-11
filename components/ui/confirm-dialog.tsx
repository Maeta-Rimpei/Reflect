"use client";

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import type { ConfirmDialogOptions, ConfirmDialogProps } from "@/types/confirm-dialog";

/**
 * 確認ダイアログの開閉と確定・キャンセルを扱うフック。
 * 任意の画面で setConfirmDialog(options) の代わりに openDialog(options) を使える。
 * @param loading - 確定処理実行中か（外部で管理する場合は渡す）
 * @returns dialogProps（ConfirmDialog にそのまま渡す）, openDialog, handleConfirm, handleCancel
 */
export function useConfirmDialog(loading = false) {
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);

  const openDialog = useCallback((opts: ConfirmDialogOptions) => {
    setOptions(opts);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!options) return;
    options.onConfirm();
  }, [options]);

  const handleCancel = useCallback(() => {
    setOptions(null);
  }, []);

  const dialogProps = {
    open: options !== null,
    title: options?.title ?? "",
    description: options?.description ?? "",
    confirmLabel: options?.confirmLabel ?? "実行する",
    loading,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  } as const;

  return { dialogProps, openDialog, handleConfirm, handleCancel };
}

/** 確認ダイアログ（生成前の確認など）。モーダルでタイトル・説明・キャンセル/確定ボタンを表示する */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg mx-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-5">
          {description}
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent cursor-pointer disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-foreground text-background px-4 py-2 text-xs font-medium hover:bg-foreground/90 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
