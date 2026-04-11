/**
 * 管理画面の案 A: 環境変数 ADMIN_EMAILS（カンマ区切り・大小無視）で管理者を判定する。
 */

import { isAdminBasicAuthConfigured } from "@/lib/admin-basic-auth";

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

/** 管理パネル用パスワード（2 段目）が設定されているか */
export function isAdminPanelPasswordConfigured(): boolean {
  const p = process.env.ADMIN_PANEL_PASSWORD;
  return typeof p === "string" && p.length > 0;
}

/** ADMIN_EMAILS, Basic, panel password, and signing secret are all set. */
export function isAdminHardSurfaceConfigured(): boolean {
  if (!isAdminConfigured() || !isAdminBasicAuthConfigured() || !isAdminPanelPasswordConfigured()) {
    return false;
  }
  const secret = process.env.ADMIN_PANEL_SECRET ?? process.env.AUTH_SECRET;
  return typeof secret === "string" && secret.length > 0;
}
