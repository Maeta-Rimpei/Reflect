import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAdminConfigured, isAdminEmail } from "@/lib/admin-env";

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (!isAdminConfigured()) {
    if (pathname === "/admin/unavailable") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/admin/unavailable", req.url));
  }

  if (pathname === "/admin/forbidden" || pathname === "/admin/unavailable") {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required for middleware");
  }

  // Edge では @/auth を import しない（crypto/password 等の Node モジュールを引かない）
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
  matcher: ["/admin", "/admin/:path*"],
};
