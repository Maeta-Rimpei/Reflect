import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { getResend, isResendConfigured, MAIL_FROM } from "@/lib/resend";
import { logger } from "@/lib/logger";

const TOKEN_EXPIRY_MINUTES = 15;

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured() || !isResendConfigured()) {
    return NextResponse.json(
      { error: "unavailable", message: "メールログインは現在利用できません。Google アカウントでログインしてください。" },
      { status: 503 },
    );
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "validation", message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "validation", message: "有効なメールアドレスを入力してください。" },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseAdminClient();

    // 古いトークンを削除（同じメールの未使用トークン）
    await supabase
      .from("magic_link_tokens")
      .delete()
      .eq("email", email);

    // 新しいトークンを生成
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000,
    ).toISOString();

    const { error: insertError } = await supabase
      .from("magic_link_tokens")
      .insert({ email, token, expires_at: expiresAt });

    if (insertError) {
      logger.error("[magic-link send] トークン保存に失敗", { message: insertError.message, code: insertError.code });
      return NextResponse.json(
        { error: "internal", message: "トークンの保存に失敗しました。" },
        { status: 500 },
      );
    }

    // Magic Link URL
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const verifyUrl = `${baseUrl}/auth/verify?token=${token}`;

    // Resend でメール送信
    const resend = getResend();
    const { error: sendError } = await resend.emails.send({
      from: MAIL_FROM,
      to: email,
      subject: "Reflect にログイン",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
          <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Reflect へようこそ</h2>
          <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 24px;">
            以下のボタンをクリックしてログインしてください。<br/>
            このリンクは ${TOKEN_EXPIRY_MINUTES} 分間有効です。
          </p>
          <a
            href="${verifyUrl}"
            style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;"
          >
            ログインする
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 32px;">
            このメールに心当たりがない場合は無視してください。
          </p>
        </div>
      `,
    });

    if (sendError) {
      logger.error("[magic-link send] メール送信に失敗", { message: sendError.message });
      return NextResponse.json(
        { error: "internal", message: "メールの送信に失敗しました。" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.errorException("[magic-link send] メール送信処理でエラー", e);
    return NextResponse.json(
      { error: "internal", message: "エラーが発生しました。" },
      { status: 500 },
    );
  }
}
