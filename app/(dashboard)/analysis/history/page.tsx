import { redirect } from "next/navigation";
import { auth } from "@/auth";
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

  const initialData = await fetchAnalysisHistoryInitialData(session.user.id);

  return <AnalysisHistoryPage initialData={initialData} />;
}
