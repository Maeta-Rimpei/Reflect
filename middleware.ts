import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkAdminBasicAuth, isAdminBasicAuthConfigured } from "@/lib/admin-basic-auth";
import { isAdminConfigured, isAdminEmail, isAdminHardSurfaceConfigured } from "@/lib/admin-env";
import { verifyAdminPanelCookieFromRequest } from "@/lib/admin-panel-token";

/** Auth.js と同じ secure cookie 判定（AUTH_URL / NEXTAUTH_URL のプロトコル） */
function authUseSecureCookies(): boolean {
  const raw = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (!raw) return false;
  try {
    return new URL(raw).protocol === "https:";
  } catch {
    return false;
  }
}

function isAdminApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/admin");
}

function isAdminPagePath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

/** Basic・パネルパスワード・署名用シークレットを要らない公開パス */
function isAdminPublicPath(pathname: string): boolean {
  return (
    pathname === "/admin/forbidden" ||
    pathname === "/admin/unavailable" ||
    pathname === "/admin/gate" ||
    pathname === "/api/admin/gate"
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isAdminPagePath(pathname) && !isAdminApiPath(pathname)) {
    return NextResponse.next();
  }

  if (!isAdminConfigured()) {
    if (pathname === "/admin/unavailable") {
      return NextResponse.next();
    }
    if (isAdminApiPath(pathname)) {
      return NextResponse.json(
        { error: "unavailable", message: "管理画面は利用できません。" },
        { status: 503 },
      );
    }
    return NextResponse.redirect(new URL("/admin/unavailable", req.url));
  }

  if (!isAdminBasicAuthConfigured()) {
    if (pathname === "/admin/unavailable") {
      return NextResponse.next();
    }
    if (isAdminApiPath(pathname)) {
      return NextResponse.json(
        { error: "unavailable", message: "HTTP Basic 認証が未設定です。" },
        { status: 503 },
      );
    }
    return NextResponse.redirect(new URL("/admin/unavailable", req.url));
  }

  const basicAuthResponse = checkAdminBasicAuth(req);
  if (basicAuthResponse) {
    return basicAuthResponse;
  }

  if (!isAdminHardSurfaceConfigured()) {
    if (pathname === "/admin/unavailable") {
      return NextResponse.next();
    }
    if (isAdminApiPath(pathname)) {
      return NextResponse.json(
        {
          error: "unavailable",
          message:
            "管理画面の設定が不完全です（ADMIN_PANEL_PASSWORD または署名用シークレット）。",
        },
        { status: 503 },
      );
    }
    return NextResponse.redirect(new URL("/admin/unavailable", req.url));
  }

  if (isAdminPublicPath(pathname)) {
    return NextResponse.next();
  }

  const hasPanel = await verifyAdminPanelCookieFromRequest(req);
  if (!hasPanel) {
    if (isAdminApiPath(pathname)) {
      return NextResponse.json(
        {
          error: "admin_gate_required",
          message: "管理パネル認証が必要です。",
        },
        { status: 401 },
      );
    }
    const gate = new URL("/admin/gate", req.url);
    gate.searchParams.set("returnTo", pathname + req.nextUrl.search);
    return NextResponse.redirect(gate);
  }

  if (isAdminApiPath(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required for middleware");
  }

  const token = await getToken({
    req,
    secret,
    secureCookie: authUseSecureCookies(),
  });

  if (!token) {
    const login = new URL("/login", req.url);
    const callback = pathname + req.nextUrl.search;
    login.searchParams.set("callbackUrl", callback);
    return NextResponse.redirect(login);
  }

  const email = typeof token.email === "string" ? token.email : undefined;
  if (!isAdminEmail(email)) {
    return NextResponse.redirect(new URL("/admin/forbidden", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin", "/api/admin/:path*"],
};
