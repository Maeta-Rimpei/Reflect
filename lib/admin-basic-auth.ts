import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Character-wise compare; same-length check first (Edge-safe). */
function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** 両方とも非空のときだけ Basic 認証を有効にする */
export function isAdminBasicAuthConfigured(): boolean {
  const user = process.env.ADMIN_BASIC_AUTH_USER;
  const pass = process.env.ADMIN_BASIC_AUTH_PASSWORD;
  return Boolean(user && pass && user.length > 0 && pass.length > 0);
}

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Reflect Admin"',
      "Cache-Control": "no-store",
    },
  });
}

/**
 * 管理画面用 HTTP Basic 認証。未設定時は null（スキップ）。
 * 失敗時は 401 レスポンス。
 */
export function checkAdminBasicAuth(req: NextRequest): NextResponse | null {
  if (!isAdminBasicAuthConfigured()) {
    return null;
  }

  const expectedUser = process.env.ADMIN_BASIC_AUTH_USER as string;
  const expectedPass = process.env.ADMIN_BASIC_AUTH_PASSWORD as string;

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return unauthorized();
  }

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }

  const colon = decoded.indexOf(":");
  const u = colon >= 0 ? decoded.slice(0, colon) : decoded;
  const p = colon >= 0 ? decoded.slice(colon + 1) : "";

  if (
    !timingSafeEqualString(u, expectedUser) ||
    !timingSafeEqualString(p, expectedPass)
  ) {
    return unauthorized();
  }

  return null;
}
