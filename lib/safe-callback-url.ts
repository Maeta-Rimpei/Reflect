/**
 * オープンリダイレクト防止のため、同一オリジン内パスのみ許可する。
 */
export function getSafeInternalPath(url: string | undefined | null): string | null {
  if (url == null || typeof url !== "string") return null;
  const t = url.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return null;
  return t;
}
