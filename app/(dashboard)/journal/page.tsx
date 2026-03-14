import { auth } from "@/auth";
import { fetchJournalInitialData } from "@/lib/fetch-journal-initial-data";
import { JournalPage } from "@/components/journal-page";
import { SignInPanel } from "@/components/auth/sign-in-panel";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-background">
        <SignInPanel />
      </div>
    );
  }

  const initialData = await fetchJournalInitialData(
    session.user.id,
    session.user.email ?? null,
    session.user.name ?? null,
  );

  return <JournalPage initialData={initialData} />;
}
