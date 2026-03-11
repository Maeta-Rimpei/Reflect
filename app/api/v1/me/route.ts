import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { getPlan } from "@/lib/get-plan";

/**
 * ログインユーザーのプロフィール（id, email, name, plan）を返す。
 * 未登録の場合は users に挿入してから返す。論理削除済みは 401。plan は getPlan で取得（解約後は期間終了で Free）。
 */
export async function GET() {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "unavailable", message: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authorization required" },
      { status: 401 },
    );
  }

  const userId = session.user.id;
  const email = session.user.email ?? null;
  const name = session.user.name ?? null;

  try {
    const supabase = createSupabaseAdminClient();
    const { data: existing } = await supabase
      .from("users")
      .select("id, deleted_at")
      .eq("id", userId)
      .maybeSingle();

    if ((existing as { deleted_at?: string | null } | null)?.deleted_at) {
      return NextResponse.json(
        { error: "unauthorized", message: "Account has been deactivated" },
        { status: 401 },
      );
    }

    if (existing) {
      await supabase
        .from("users")
        .update({ email, name, updated_at: new Date().toISOString() })
        .eq("id", userId);
    } else {
      await supabase.from("users").insert({
        id: userId,
        email,
        name,
        plan: "free",
        updated_at: new Date().toISOString(),
      });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", userId)
      .single();

    const plan = await getPlan();

    const { data: entryRows } = await supabase
      .from("entries")
      .select("posted_at")
      .eq("user_id", userId);
    const totalEntryDays =
      entryRows != null ? new Set(entryRows.map((r) => r.posted_at)).size : 0;

    return NextResponse.json({
      id: userId,
      email: profile?.email ?? email ?? undefined,
      name: profile?.name ?? name ?? undefined,
      plan,
      totalEntryDays,
    });
  } catch {
    return NextResponse.json(
      { error: "internal", message: "Failed to get user" },
      { status: 500 },
    );
  }
}
