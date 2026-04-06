/** contact_requests.category の表示ラベル */
export const CONTACT_CATEGORY_LABEL: Record<string, string> = {
  bug: "不具合",
  billing: "課金",
  account: "アカウント",
  feature: "機能要望",
  other: "その他",
};

export function contactCategoryLabel(category: string): string {
  return CONTACT_CATEGORY_LABEL[category] ?? category;
}
