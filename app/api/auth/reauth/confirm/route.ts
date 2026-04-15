import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase-admin";
import { authenticateEmailPassword } from "@/lib/email-password-login";
import { COOKIE_STRIPE_PORTAL_REAUTH } from "@/constants/cookies";

type ReauthMode = "password" | "google";

/**
 * Stripe ポータル表示前の本人再確認を行い、短命の確認 Cookie を発行する。
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "Authorization required" },
      { status: 401 },
    );
  }

  let body: { mode?: ReauthMode; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "validation", message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const mode = body.mode;
  if (mode !== "password" && mode !== "google") {
    return NextResponse.json(
      { error: "validation", message: "Invalid mode" },
      { status: 400 },
    );
  }

  if (mode === "password") {
    const email = session.user.email?.trim().toLowerCase();
    const password = body.password;
    if (!email || !password) {
      return NextResponse.json(
        { error: "validation", message: "メールアドレスとパスワードが必要です。" },
        { status: 400 },
      );
    }
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json(
        { error: "unavailable", message: "サービスが利用できません。" },
        { status: 503 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const result = await authenticateEmailPassword(supabase, email, password);
    if (!result.ok) {
      return NextResponse.json(
        { error: "invalid_credentials", message: "パスワード確認に失敗しました。" },
        { status: 401 },
      );
    }
  }

  if (mode === "google") {
    const provider = session.user.authProvider;
    const reauthAt = session.googleReauthAt;
    const now = Math.floor(Date.now() / 1000);
    const reauthFreshSec = 180;
    if (
      provider !== "google" ||
      typeof reauthAt !== "number" ||
      now - reauthAt > reauthFreshSec
    ) {
      return NextResponse.json(
        { error: "reauth_required", message: "Google で再認証してください。" },
        { status: 403 },
      );
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_STRIPE_PORTAL_REAUTH, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/stripe/create-portal-session",
    maxAge: 60 * 5,
  });
  return res;
}
