import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AnalysisPage } from "@/components/analysis-page";
import { fetchAnalysisInitialData } from "@/lib/fetch-analysis-initial-data";
import { getPlan } from "@/lib/get-plan";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [dataWithoutPlan, plan] = await Promise.all([
    fetchAnalysisInitialData(session.user.id),
    getPlan(),
  ]);

  const initialData = { ...dataWithoutPlan, plan };

  return <AnalysisPage initialData={initialData} />;
}
