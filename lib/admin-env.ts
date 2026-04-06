/**
 * 管理画面の案 A: 環境変数 ADMIN_EMAILS（カンマ区切り・大小無視）で管理者を判定する。
 */

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

/** パース済み管理者メールの Set。未設定時は null（管理機能オフ） */
export function getAdminEmailSet(): Set<string> | null {
  const raw = process.env.ADMIN_EMAILS;
  if (raw == null || String(raw).trim() === "") return null;
  const parts = String(raw)
    .split(",")
    .map((s) => normalizeEmail(s))
    .filter(Boolean);
  if (parts.length === 0) return null;
  return new Set(parts);
}

export function isAdminConfigured(): boolean {
  return getAdminEmailSet() !== null;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const set = getAdminEmailSet();
  if (!set || !email) return false;
  return set.has(normalizeEmail(email));
}
