"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

/**
 * NextAuth のセッションを子コンポーネントに提供するラッパー。
 * @param children - アプリのルート（useSession 等を使うためここでラップする）
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
