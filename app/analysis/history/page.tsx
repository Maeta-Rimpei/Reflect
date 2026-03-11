import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { AnalysisHistoryPage } from "@/components/analysis-history-page";
import { fetchAnalysisHistoryInitialData } from "@/lib/fetch-analysis-history-initial-data";
import { getPlan } from "@/lib/get-plan";

export const dynamic = "force-dynamic";

/** 週次・月次・年次レポートの履歴一覧（Deep 専用）。分析ページから「過去のレポートを見る」で遷移。 */
export default async function AnalysisHistoryPageRoute() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const plan = await getPlan();
  if (plan !== "deep") {
    redirect("/analysis");
  }

  const baseUrl =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const initialData = await fetchAnalysisHistoryInitialData(baseUrl, cookieHeader);

  return (
    <AppShell plan={plan}>
      <AnalysisHistoryPage initialData={initialData} />
    </AppShell>
  );
}
