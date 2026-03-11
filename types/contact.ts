/** お問い合わせカテゴリ（DB の CHECK と一致） */
export type ContactCategory = "bug" | "billing" | "account" | "feature" | "other";

/** カテゴリの選択肢（value + 表示ラベル） */
export const CONTACT_CATEGORIES: { value: ContactCategory; label: string }[] = [
  { value: "bug", label: "不具合報告" },
  { value: "billing", label: "料金関連" },
  { value: "account", label: "アカウント関連" },
  { value: "feature", label: "機能要望" },
  { value: "other", label: "その他" },
];
