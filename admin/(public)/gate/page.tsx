import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminHardSurfaceConfigured } from "@/lib/admin-env";

export const metadata: Metadata = {
  title: "管理パネル認証 | 管理",
  robots: { index: false, follow: false },
};

export default async function AdminGatePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string; locked?: string }>;
}) {
  const sp = await searchParams;

  if (!isAdminHardSurfaceConfigured()) {
    redirect("/admin/unavailable");
  }

  const returnTo =
    typeof sp.returnTo === "string" && sp.returnTo.startsWith("/admin")
      ? sp.returnTo
      : "/admin";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-base font-semibold text-foreground">管理パネル</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          2 段目のパスワードを入力してください（HTTP Basic 認証に続く認証です）。
        </p>

        {sp.locked === "1" ? (
          <p className="mt-4 rounded-lg border border-red-600/40 bg-destructive/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">
            試行回数の上限に達しました。しばらく時間をおいてから再度お試しください。
          </p>
        ) : null}
        {sp.error === "1" ? (
          <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-foreground">
            パスワードが正しくありません。
          </p>
        ) : null}
        {sp.error === "server" ? (
          <p className="mt-4 rounded-lg border border-red-600/40 bg-destructive/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">
            認証処理に失敗しました。しばらくしてから再度お試しください。
          </p>
        ) : null}

        <form action="/api/admin/gate" method="post" className="mt-6 space-y-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <div>
            <label
              htmlFor="admin-panel-password"
              className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
            >
              パスワード
            </label>
            <input
              id="admin-panel-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-foreground py-2.5 text-xs font-medium text-background hover:bg-foreground/90"
          >
            続行
          </button>
        </form>

        <Link
          href="/journal"
          className="mt-6 block text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Return to journal
        </Link>
      </div>
    </div>
  );
}
