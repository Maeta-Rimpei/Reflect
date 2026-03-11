import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { HistoryPage } from "@/components/history-page";
import { fetchHistoryInitialData } from "@/lib/fetch-history-initial-data";
import { getPlan } from "@/lib/get-plan";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const baseUrl =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const [initialData, plan] = await Promise.all([
    fetchHistoryInitialData(baseUrl, cookieHeader),
    getPlan(),
  ]);

  return (
    <AppShell plan={plan}>
      <HistoryPage initialData={initialData} />
    </AppShell>
  );
}
