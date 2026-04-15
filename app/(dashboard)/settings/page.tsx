import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Suspense } from "react";
import { SettingsPage } from "@/components/settings-page";
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

  const [profile, params] = await Promise.all([getProfile(), searchParams]);

  const initialMessage =
    params?.canceled === "1"
      ? ({ type: "info" as const, text: "お支払いがキャンセルされました。" })
      : null;

  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">読み込み中…</div>}>
      <SettingsPage
        initialProfile={{ plan: profile.plan, email: profile.email, name: profile.name }}
        initialMessage={initialMessage}
        initialAuthProvider={session.user.authProvider ?? null}
      />
    </Suspense>
  );
}
