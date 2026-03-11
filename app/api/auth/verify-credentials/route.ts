import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { verifyPassword } from "@/lib/password";
import { logger } from "@/lib/logger";

/**
 * メール+パスワードの検証のみを行う（セッション発行はしない）。
 * NextAuth v5 beta の signIn(..., { redirect: false }) が
 * authorize=null でも ok:true を返す問題への対策。
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "unavailable", message: "サービスが利用できません。" },
      { status: 503 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "validation", message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "validation", message: "メールアドレスとパスワードを入力してください。" },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseAdminClient();

    const { data: user } = await supabase
      .from("users")
      .select("id, password_hash, email_verified")
      .eq("email", email)
      .single();

    if (!user || !user.password_hash) {
      return NextResponse.json(
        { error: "invalid", message: "メールアドレスまたはパスワードが正しくありません。" },
        { status: 401 },
      );
    }

    // メール未認証チェック
    if (user.email_verified === false) {
      return NextResponse.json(
        { error: "unverified", message: "メールアドレスが未認証です。登録時に届いたメールのリンクをクリックしてください。" },
        { status: 403 },
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "invalid", message: "メールアドレスまたはパスワードが正しくありません。" },
        { status: 401 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.errorException("[verify-credentials] 認証情報検証でエラー", e);
    return NextResponse.json(
      { error: "internal", message: "エラーが発生しました。" },
      { status: 500 },
    );
  }
}
