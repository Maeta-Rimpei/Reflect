import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { hashPassword } from "@/lib/password";
import { getResend, isResendConfigured, MAIL_FROM } from "@/lib/resend";
import { logger } from "@/lib/logger";
import { PLAN_FREE } from "@/constants/plan";

const TOKEN_EXPIRY_MINUTES = 60;

const PASSWORD_MIN_LENGTH = 8;

function validatePasswordFormat(
  password: string,
): { ok: true } | { ok: false; message: string } {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: "パスワードは8文字以上で入力してください。",
    };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return {
      ok: false,
      message: "パスワードに英字を1文字以上含めてください。",
    };
  }
  if (!/\d/.test(password)) {
    return {
      ok: false,
      message: "パスワードに数字を1文字以上含めてください。",
    };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "unavailable", message: "サービスが利用できません。" },
      { status: 503 },
    );
  }

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch (e) {
    logger.errorException("[signup] リクエスト JSON の解析に失敗", e);
    return NextResponse.json(
      { error: "validation", message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const name = body.name?.trim() || null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "validation", message: "有効なメールアドレスを入力してください。" },
      { status: 400 },
    );
  }

  if (!password) {
    return NextResponse.json(
      { error: "validation", message: "パスワードを入力してください。" },
      { status: 400 },
    );
  }
  const passwordCheck = validatePasswordFormat(password);
  if (!passwordCheck.ok) {
    return NextResponse.json(
      { error: "validation", message: passwordCheck.message },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseAdminClient();

    // 既存ユーザーの確認
    const { data: existing } = await supabase
      .from("users")
      .select("id, email_verified")
      .eq("email", email)
      .single();

    if (existing && existing.email_verified !== false) {
      return NextResponse.json(
        { error: "conflict", message: "このメールアドレスは既に登録されています。" },
        { status: 409 },
      );
    }

    // パスワードハッシュ化
    const passwordHash = await hashPassword(password);

    if (existing && existing.email_verified === false) {
      // 未認証の既存ユーザー → パスワードを更新して再送
      await supabase
        .from("users")
        .update({ password_hash: passwordHash, name, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      // 新規ユーザー作成（email_verified = false）
      const newId = crypto.randomUUID();
      const { error: insertError } = await supabase.from("users").insert({
        id: newId,
        email,
        name,
        password_hash: passwordHash,
        email_verified: false,
        plan: PLAN_FREE,
      });

      if (insertError) {
        logger.error("[signup] ユーザー登録に失敗", { message: insertError.message, code: insertError.code });
        return NextResponse.json(
          { error: "internal", message: "アカウントの作成に失敗しました。" },
          { status: 500 },
        );
      }
    }

    // メール認証リンクを送信
    if (!isResendConfigured()) {
      // Resend 未設定の場合は認証をスキップ（開発用）
      await supabase
        .from("users")
        .update({ email_verified: true, updated_at: new Date().toISOString() })
        .eq("email", email);
      return NextResponse.json({ ok: true, verified: true });
    }

    // 古いトークンを削除
    await supabase
      .from("magic_link_tokens")
      .delete()
      .eq("email", email);

    // 新しいトークンを生成
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000,
    ).toISOString();

    await supabase
      .from("magic_link_tokens")
      .insert({ email, token, expires_at: expiresAt });

    const baseUrl =
      process.env.NEXTAUTH_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";
    const verifyUrl = `${baseUrl}/auth/verify?token=${token}`;

    const mailFrom = MAIL_FROM;
    if (!mailFrom) {
      return NextResponse.json(
        { error: "unavailable", message: "認証メールを送信できません。しばらくしてからお試しください。" },
        { status: 503 },
      );
    }

    const resend = getResend();
    const { error: sendError } = await resend.emails.send({
      from: mailFrom,
      to: email,
      subject: "Reflect — メールアドレスの確認",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
          <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Reflect へようこそ</h2>
          <p style="font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 24px;">
            以下のボタンをクリックしてメールアドレスを確認し、登録を完了してください。<br/>
            このリンクは ${TOKEN_EXPIRY_MINUTES} 分間有効です。
          </p>
          <a
            href="${verifyUrl}"
            style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;"
          >
            メールアドレスを確認する
          </a>
          <p style="font-size: 12px; color: #999; margin-top: 32px;">
            このメールに心当たりがない場合は無視してください。
          </p>
        </div>
      `,
    });

    if (sendError) {
      logger.error("[signup] 認証メール送信に失敗", { message: sendError.message });
      return NextResponse.json(
        { error: "internal", message: "認証メールの送信に失敗しました。" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, verified: false });
  } catch (e) {
    logger.errorException("[signup] 新規登録でエラー", e, { email });
    return NextResponse.json(
      { error: "internal", message: "エラーが発生しました。" },
      { status: 500 },
    );
  }
}
