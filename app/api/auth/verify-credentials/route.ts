import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import {
  authenticateEmailPassword,
  PASSWORD_LOGIN_LOCKED_MESSAGE,
} from "@/lib/email-password-login";
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
  } catch (e) {
    logger.errorException("[verify-credentials] リクエスト JSON の解析に失敗", e);
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
    const result = await authenticateEmailPassword(supabase, email, password);

    if (result.ok) {
      return NextResponse.json({ ok: true });
    }

    if (result.reason === "unverified") {
      return NextResponse.json(
        {
          error: "unverified",
          message:
            "メールアドレスが未認証です。登録時に届いたメールのリンクをクリックしてください。",
        },
        { status: 403 },
      );
    }

    if (result.reason === "locked") {
      return NextResponse.json(
        { error: "locked", message: PASSWORD_LOGIN_LOCKED_MESSAGE },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        error: "invalid",
        message: "メールアドレスまたはパスワードが正しくありません。",
      },
      { status: 401 },
    );
  } catch (e) {
    logger.errorException("[verify-credentials] 認証情報検証でエラー", e, {
      email,
    });
    return NextResponse.json(
      { error: "internal", message: "エラーが発生しました。" },
      { status: 500 },
    );
  }
}
