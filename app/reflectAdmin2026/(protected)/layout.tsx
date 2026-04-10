import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard, Users, Mail, ArrowLeft, Cpu } from "lucide-react";
import { requireAdminSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "管理",
  robots: { index: false, follow: false },
};

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Reflect 管理
            </span>
            <nav className="flex flex-wrap items-center gap-1 text-xs">
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                ダッシュボード
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Users className="h-3.5 w-3.5" />
                ユーザー
              </Link>
              <Link
                href="/admin/contact"
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Mail className="h-3.5 w-3.5" />
                問い合わせ
              </Link>
              <Link
                href="/admin/system"
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Cpu className="h-3.5 w-3.5" />
                システム
              </Link>
            </nav>
          </div>
          <Link
            href="/journal"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            アプリへ戻る
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
