import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "アクセス拒否 | 管理",
  robots: { index: false, follow: false },
};

/** ログイン済みだが ADMIN_EMAILS に含まれないユーザー向け */
export default function AdminForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-base font-semibold text-foreground">権限がありません</h1>
        <Link
          href="/journal"
          className="mt-6 inline-block text-xs font-medium text-foreground underline underline-offset-2"
        >
          アプリへ戻る
        </Link>
      </div>
    </div>
  );
}
