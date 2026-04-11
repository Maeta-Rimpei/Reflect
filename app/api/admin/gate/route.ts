import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  adminGateClear,
  adminGateClientKey,
  adminGateGetState,
  adminGateRecordFailure,
} from "@/lib/admin-gate-lockout";
import { isAdminHardSurfaceConfigured } from "@/lib/admin-env";
import {
  ADMIN_PANEL_COOKIE_NAME,
  ADMIN_PANEL_TOKEN_MAX_AGE_SEC,
  createAdminPanelToken,
} from "@/lib/admin-panel-token";
import { logger } from "@/lib/logger";

function safeReturnTo(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "/admin";
  const t = raw.trim();
  if (!t.startsWith("/admin")) return "/admin";
  if (t.includes("//") || t.includes("\\") || t.includes("\n")) return "/admin";
  return t;
}

function timingSafeUtf8Equal(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function POST(req: NextRequest) {
  if (!isAdminHardSurfaceConfigured()) {
    return NextResponse.json(
      { error: "unavailable", message: "管理画面の設定が不完全です。" },
      { status: 503 },
    );
  }

  const expected = process.env.ADMIN_PANEL_PASSWORD as string;
  const secret = (process.env.ADMIN_PANEL_SECRET ?? process.env.AUTH_SECRET) as string;

  let password = "";
  let returnTo = "/admin";
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      const j = (await req.json()) as { password?: string; returnTo?: string };
      password = typeof j.password === "string" ? j.password : "";
      returnTo = safeReturnTo(j.returnTo);
    } else {
      const fd = await req.formData();
      password = String(fd.get("password") ?? "");
      returnTo = safeReturnTo(String(fd.get("returnTo") ?? "/admin"));
    }
  } catch {
    return NextResponse.redirect(new URL("/admin/gate?error=invalid", req.url), 303);
  }

  const clientKey = await adminGateClientKey(req.headers);
  const state = await adminGateGetState(clientKey);
  if (state.locked) {
    return NextResponse.redirect(new URL("/admin/gate?locked=1", req.url), 303);
  }

  if (!timingSafeUtf8Equal(password, expected)) {
    const { locked } = await adminGateRecordFailure(clientKey);
    if (locked) {
      return NextResponse.redirect(new URL("/admin/gate?locked=1", req.url), 303);
    }
    return NextResponse.redirect(new URL("/admin/gate?error=1", req.url), 303);
  }

  try {
    await adminGateClear(clientKey);
    const token = await createAdminPanelToken(secret);
    const res = NextResponse.redirect(new URL(returnTo, req.url), 303);
    res.cookies.set({
      name: ADMIN_PANEL_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_PANEL_TOKEN_MAX_AGE_SEC,
    });
    return res;
  } catch (e) {
    logger.errorException("[admin/gate] トークン発行に失敗", e);
    return NextResponse.redirect(new URL("/admin/gate?error=server", req.url), 303);
  }
}
