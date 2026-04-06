import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminConfigured, isAdminEmail } from "@/lib/admin-env";

/**
 * 管理 API 用: セッション + ADMIN_EMAILS。失敗時は JSON を返す。
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
