import { auth } from "@/auth";
import { getPlan } from "@/lib/get-plan";
import { AppShell } from "@/components/app-shell";
import { redirect } from "next/navigation";

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
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const plan = await getPlan();

  return <AppShell plan={plan}>{children}</AppShell>;
}
