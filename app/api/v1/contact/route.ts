import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { getResend, isResendConfigured, MAIL_FROM } from "@/lib/resend";
import { logger } from "@/lib/logger";
import { MAX_CONTACT_BODY_LENGTH } from "@/constants/limits";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 許可するお問い合わせカテゴリ（DB の CHECK と一致） */
const CATEGORIES = ["bug", "billing", "account", "feature", "other"] as const;
/**
 * お問い合わせを1件保存する。認証必須。
 * @param req - JSON body: { category: ContactCategory, body: string }
 * @returns 200 + { ok, message }、または 400/401/500
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "unavailable", message: "お問い合わせは現在利用できません。" },
      { status: 503 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "ログインしてください。" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  try {
    const body = (await req.json().catch(() => null)) as {
      category?: string;
      body?: string;
    } | null;

    const category = body?.category;
    if (!category || !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
      return NextResponse.json(
        { error: "validation", message: "カテゴリを選択してください。" },
        { status: 400 }
      );
    }

    const text = typeof body?.body === "string" ? body.body.trim() : "";
    if (!text) {
      return NextResponse.json(
        { error: "validation", message: "お問い合わせ内容を入力してください。" },
        { status: 400 }
      );
    }
    if (text.length > MAX_CONTACT_BODY_LENGTH) {
      return NextResponse.json(
        { error: "validation", message: `本文は${MAX_CONTACT_BODY_LENGTH}文字以内で入力してください。` },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("contact_requests").insert({
      user_id: userId,
      category,
      body: text,
    });

    if (error) {
      logger.error("[contact] insert failed", {
        message: error.message,
        userId,
        category,
      });
      return NextResponse.json(
        { error: "db_error", message: "送信に失敗しました。" },
        { status: 500 }
      );
    }

    // Resend でお問い合わせを送信（宛先は環境変数 RESEND_CONTACT_TO_EMAIL）
    const contactToEmail = process.env.RESEND_CONTACT_TO_EMAIL;
    const mailFrom = MAIL_FROM;
    if (isResendConfigured() && mailFrom && contactToEmail) {
      const categoryLabels: Record<string, string> = {
        bug: "不具合報告",
        billing: "料金関連",
        account: "アカウント関連",
        feature: "機能要望",
        other: "その他",
      };
      const categoryLabel = categoryLabels[category] ?? category;
      const userEmail = session.user.email ?? "（未設定）";
      const userName = session.user.name ?? "（未設定）";

      try {
        const resend = getResend();
        const { error: sendError } = await resend.emails.send({
          from: mailFrom,
          to: contactToEmail,
          replyTo: userEmail,
          subject: `[Reflect お問い合わせ] ${categoryLabel}`,
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px 0;">
              <h2 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">お問い合わせ（${categoryLabel}）</h2>
              <table style="font-size: 14px; color: #333; border-collapse: collapse;">
                <tr><td style="padding: 4px 8px 4px 0; vertical-align: top;">ユーザー名</td><td>${escapeHtml(userName)}</td></tr>
                <tr><td style="padding: 4px 8px 4px 0; vertical-align: top;">メール</td><td>${escapeHtml(userEmail)}</td></tr>
                <tr><td style="padding: 4px 8px 4px 0; vertical-align: top;">カテゴリ</td><td>${escapeHtml(categoryLabel)}</td></tr>
              </table>
              <h3 style="font-size: 14px; font-weight: 600; margin: 16px 0 8px;">内容</h3>
              <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(text)}</div>
            </div>
          `,
        });
        if (sendError) {
          logger.error("[contact] Resend 送信に失敗", {
            message: sendError.message,
            userId,
            category,
          });
        }
      } catch (e) {
        logger.errorException("[contact] Resend 送信でエラー", e, {
          userId,
          category,
        });
      }
    }

    return NextResponse.json({ ok: true, message: "お問い合わせを受け付けました。" });
  } catch (e) {
    logger.errorException("[contact POST] お問い合わせ処理でエラー", e, {
      userId,
    });
    return NextResponse.json(
      { error: "internal", message: "送信に失敗しました。" },
      { status: 500 }
    );
  }
}
