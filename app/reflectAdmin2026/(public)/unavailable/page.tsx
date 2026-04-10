import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminConfigured } from "@/lib/admin-env";

export const metadata: Metadata = {
  title: "管理画面は利用できません | 管理",
  robots: { index: false, follow: false },
};

/** ADMIN_EMAILS 未設定時。設定済みの場合はダッシュボードへ。 */
export default function AdminUnavailablePage() {
  if (isAdminConfigured()) {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-base font-semibold text-foreground">管理画面は無効です</h1>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          環境変数{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">ADMIN_EMAILS</code>{" "}
          が未設定のため、管理画面は利用できません。本番で有効にする場合はカンマ区切りで管理者のメールアドレスを設定してください。
        </p>
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
