import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  isAdminConfigured,
  isAdminEmail,
  isAdminHardSurfaceConfigured,
} from "@/lib/admin-env";
import {
  ADMIN_PANEL_COOKIE_NAME,
  verifyAdminPanelCookieValue,
} from "@/lib/admin-panel-token";

/**
 * 管理 API 用: パネル Cookie・セッション + ADMIN_EMAILS。失敗時は JSON を返す。
 */
export async function requireAdminJson() {
  if (!isAdminConfigured()) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "unavailable", message: "管理画面は利用できません。" },
        { status: 503 },
      ),
    };
  }

  if (!isAdminHardSurfaceConfigured()) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "unavailable", message: "管理画面の設定が不完全です。" },
        { status: 503 },
      ),
    };
  }

  const cookieStore = await cookies();
  const panelOk = await verifyAdminPanelCookieValue(
    cookieStore.get(ADMIN_PANEL_COOKIE_NAME)?.value,
  );
  if (!panelOk) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "admin_gate_required", message: "管理パネル認証が必要です。" },
        { status: 401 },
      ),
    };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "unauthorized", message: "ログインしてください。" },
        { status: 401 },
      ),
    };
  }

  if (!isAdminEmail(session.user.email)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "forbidden", message: "権限がありません。" },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const, session };
}
