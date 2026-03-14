import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EmotionsPage } from "@/components/emotions-page";
import { fetchEmotionsInitialData } from "@/lib/fetch-emotions-initial-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const initialData = await fetchEmotionsInitialData(session.user.id);

  return <EmotionsPage initialData={initialData} />;
}
