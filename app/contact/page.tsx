import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { ContactPage } from "@/components/contact-page";
import { getPlan } from "@/lib/get-plan";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const plan = await getPlan();

  return (
    <AppShell plan={plan}>
      <ContactPage />
    </AppShell>
  );
}
