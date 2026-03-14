import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { HistoryPage } from "@/components/history-page";
import { fetchHistoryInitialData } from "@/lib/fetch-history-initial-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const initialData = await fetchHistoryInitialData(session.user.id);

  return <HistoryPage initialData={initialData} />;
}
