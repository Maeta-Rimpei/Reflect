import { auth } from "@/auth";
import { getPlan } from "@/lib/get-plan";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

/**
 * サイドメニュー付きルートの共通レイアウト。
 * journal, history, emotions, analysis, settings, contact で共有。
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const plan = await getPlan();

  return <AppShell plan={plan}>{children}</AppShell>;
}
