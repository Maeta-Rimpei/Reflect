import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminConfigured, isAdminEmail } from "@/lib/admin-env";

/**
 * 管理画面用: ログイン済みかつ ADMIN_EMAILS に含まれるセッションのみ通す。
 * 未設定時は /admin/unavailable へ。
 */
export async function requireAdminSession() {
  if (!isAdminConfigured()) {
    redirect("/admin/unavailable");
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fadmin");
  }

  if (!isAdminEmail(session.user.email)) {
    redirect("/admin/forbidden");
  }

  return session;
}
