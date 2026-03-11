import { auth } from "@/auth";
import { cookies } from "next/headers";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import { getLastNDaysRangeInTokyo } from "@/lib/date-utils";
import { fetchJournalInitialData } from "@/lib/fetch-journal-initial-data";
import { AppShell } from "@/components/app-shell";
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

  const baseUrl =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  let deepStreakDates: string[] | undefined;
  if (isSupabaseAdminConfigured()) {
    const supabase = createSupabaseAdminClient();
    const userId = session.user.id;
    const email = session.user.email ?? null;
    const name = session.user.name ?? null;

    const { data: existing } = await supabase
      .from("users")
      .select("id, plan")
      .eq("id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("users")
        .update({ email, name, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) logger.error("[journal] ユーザー更新に失敗", { message: error.message });
    } else {
      const { error } = await supabase.from("users").insert({
        id: userId,
        email,
        name,
        plan: "free",
        updated_at: new Date().toISOString(),
      });
      if (error) logger.error("[journal] ユーザー登録に失敗", { message: error.message });
    }

    if (existing?.plan === "deep") {
      const { from, to } = getLastNDaysRangeInTokyo(366);
      const { data: rows } = await supabase
        .from("entries")
        .select("posted_at")
        .eq("user_id", userId)
        .gte("posted_at", from)
        .lte("posted_at", to);
      deepStreakDates = (rows ?? []).map((r) => String((r as { posted_at: string }).posted_at).slice(0, 10));
    }
  }

  const initialData = await fetchJournalInitialData(
    baseUrl,
    cookieHeader,
    deepStreakDates != null ? { deepStreakDates } : undefined,
  );

  return (
    <AppShell plan={initialData.plan}>
      <JournalPage initialData={initialData} />
    </AppShell>
  );
}
