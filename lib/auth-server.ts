import { auth } from "@/auth";

/**
 * API ルートでセッションを取得する。未認証なら null を返す。
 */
export async function getSession() {
  return auth();
}

/**
 * 認証済みユーザーの id を返す。未認証なら null。
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
