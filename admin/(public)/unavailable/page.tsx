import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminBasicAuthConfigured } from "@/lib/admin-basic-auth";
import {
  isAdminConfigured,
  isAdminHardSurfaceConfigured,
  isAdminPanelPasswordConfigured,
} from "@/lib/admin-env";
import { isAdminPanelSigningConfigured } from "@/lib/admin-panel-token";

export const metadata: Metadata = {
  title: "管理画面は利用できません | 管理",
  robots: { index: false, follow: false },
};

/** ADMIN_EMAILS missing or required env incomplete */
export default function AdminUnavailablePage() {
  if (isAdminConfigured() && isAdminHardSurfaceConfigured()) {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-base font-semibold text-foreground">管理画面は利用できません</h1>
        {!isAdminConfigured() ? (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            <code className="rounded bg-muted px-1 py-0.5 text-[10px]">ADMIN_EMAILS</code>{" "}
            が未設定です。コンマ区切りで管理者メールを設定してください。
          </p>
        ) : (
          <div className="mt-3 space-y-2 text-left text-xs leading-relaxed text-muted-foreground">
            <p>
              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">ADMIN_EMAILS</code>{" "}
              は設定済みですが、次のいずれかが不足しています。
            </p>
            <ul className="list-inside list-disc space-y-1 pl-1">
              <li>
                HTTP Basic:{" "}
                {isAdminBasicAuthConfigured() ? "OK" : "ADMIN_BASIC_AUTH_USER / PASSWORD"}
              </li>
              <li>
                パネルパスワード:{" "}
                {isAdminPanelPasswordConfigured() ? "OK" : "ADMIN_PANEL_PASSWORD"}
              </li>
              <li>
                署名用シークレット:{" "}
                {isAdminPanelSigningConfigured() ? "OK" : "AUTH_SECRET または ADMIN_PANEL_SECRET"}
              </li>
            </ul>
          </div>
        )}
        <Link
          href="/journal"
          className="mt-6 inline-block text-xs font-medium text-foreground underline underline-offset-2"
        >
          Return to journal
        </Link>
      </div>
    </div>
  );
}
