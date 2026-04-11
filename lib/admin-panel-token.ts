import type { NextRequest } from "next/server";

export const ADMIN_PANEL_COOKIE_NAME = "admin_panel";
/** パネル Cookie / トークンの有効秒数 */
export const ADMIN_PANEL_TOKEN_MAX_AGE_SEC = 60 * 60 * 12;

function getSigningSecret(): string | null {
  const s = process.env.ADMIN_PANEL_SECRET ?? process.env.AUTH_SECRET;
  return typeof s === "string" && s.length > 0 ? s : null;
}

function base64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]!);
  }
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(s: string): Uint8Array | null {
  try {
    const pad = 4 - (s.length % 4 || 4);
    const b64 = (s + "=".repeat(pad === 4 ? 0 : pad)).replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      out[i] = bin.charCodeAt(i);
    }
    return out;
  } catch {
    return null;
  }
}

async function hmacSha256(message: string, secret: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return new Uint8Array(sig);
}

async function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

/** 管理パネル用署名トークン文字列（Cookie 値） */
export async function createAdminPanelToken(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_PANEL_TOKEN_MAX_AGE_SEC;
  const body = String(exp);
  const sig = await hmacSha256(body, secret);
  return `${base64urlEncode(new TextEncoder().encode(body))}.${base64urlEncode(sig)}`;
}

export async function verifyAdminPanelToken(
  token: string,
  secret: string,
): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const bodyBytes = base64urlDecode(parts[0]!);
  const sigBytes = base64urlDecode(parts[1]!);
  if (!bodyBytes || !sigBytes) return false;
  const body = new TextDecoder().decode(bodyBytes);
  const exp = parseInt(body, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = await hmacSha256(body, secret);
  return await timingSafeEqualBytes(sigBytes, expected);
}

export async function verifyAdminPanelCookieFromRequest(req: NextRequest): Promise<boolean> {
  const secret = getSigningSecret();
  if (!secret) return false;
  const raw = req.cookies.get(ADMIN_PANEL_COOKIE_NAME)?.value;
  if (!raw) return false;
  return verifyAdminPanelToken(raw, secret);
}

export async function verifyAdminPanelCookieValue(
  value: string | undefined,
): Promise<boolean> {
  const secret = getSigningSecret();
  if (!secret || !value) return false;
  return verifyAdminPanelToken(value, secret);
}

export function isAdminPanelSigningConfigured(): boolean {
  return getSigningSecret() !== null;
}
