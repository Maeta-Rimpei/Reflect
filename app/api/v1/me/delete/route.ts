import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { getResend, isResendConfigured, MAIL_FROM } from "@/lib/resend";
import { logger } from "@/lib/logger";

/**
 * 退会（論理削除）
 * users.deleted_at を設定する。データは残し、ログイン不可にする。
 * 完了後メールで通知し、クライアントは /goodbye へリダイレクトする。
 */
export async function DELETE() {
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

  try {
    const supabase = createSupabaseAdminClient();

    const { data: user } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    const email = user?.email ?? session.user.email;

    const { error } = await supabase
      .from("users")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      logger.error("[me/delete] 退会処理に失敗", {
        message: error.message,
        userId,
      });
      return NextResponse.json(
        { error: "db_error", message: error.message },
        { status: 500 },
      );
    }

    const mailFrom = MAIL_FROM;
    if (email && isResendConfigured() && mailFrom) {
      const resend = getResend();
      await resend.emails.send({
        from: mailFrom,
        to: email,
        subject: "退会手続きが完了しました",
        text: [
          "Reflect をご利用いただきありがとうございました。",
          "退会手続きが完了しました。",
          "またのご利用をお待ちしております。",
        ].join("\n"),
      });
    }

    const res = NextResponse.json({ deleted: true });
    res.cookies.set("withdrawal_complete", "1", {
      path: "/goodbye",
      maxAge: 120,
      httpOnly: true,
      sameSite: "lax",
    });
    return res;
  } catch (e) {
    logger.errorException("[me/delete] 退会処理でエラー", e, { userId });
    return NextResponse.json(
      { error: "internal", message: "Failed to delete account" },
      { status: 500 },
    );
  }
}
