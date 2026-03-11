/** ダイアログを開くときに渡す内容（確定時に onConfirm が呼ばれる） */
export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}

/** 確認ダイアログの props */
export interface ConfirmDialogProps {
  /** 表示するか */
  open: boolean;
  title: string;
  description: string;
  /** 確定ボタンのラベル */
  confirmLabel: string;
  /** 確定処理実行中（ボタン無効化） */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
