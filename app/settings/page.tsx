import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { SettingsPage } from "@/components/settings-page";
import { getPlan } from "@/lib/get-plan";
import { getProfile } from "@/lib/get-profile";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string; success?: string; session_id?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [plan, profile, params] = await Promise.all([
    getPlan(),
    getProfile(),
    searchParams,
  ]);

  const initialMessage =
    params?.canceled === "1"
      ? ({ type: "info" as const, text: "お支払いがキャンセルされました。" })
      : null;

  return (
    <AppShell plan={plan}>
      <Suspense fallback={<div className="p-8 text-muted-foreground">読み込み中…</div>}>
        <SettingsPage
          initialProfile={{ plan: profile.plan, email: profile.email, name: profile.name }}
          initialMessage={initialMessage}
        />
      </Suspense>
    </AppShell>
  );
}

