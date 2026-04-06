import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { getResend, isResendConfigured, MAIL_FROM } from "@/lib/resend";
import { logger } from "@/lib/logger";
import { COOKIE_WITHDRAWAL_COMPLETE } from "@/constants/cookies";
import { stripe } from "@/lib/stripe";
import {
  cancelStripeSubscriptionForWithdrawal,
  subscriptionNeedsStripeCancel,
} from "@/lib/stripe-withdrawal";

/**
 * 退会（論理削除）
 * Deep 等で有効な Stripe サブスクがある場合は先に即時解約し、成功後に users.deleted_at を設定する。
 * データは残し、ログイン不可にする。完了後メールで通知し、クライアントは /goodbye へリダイレクトする。
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

    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", userId)
      .maybeSingle();

    const subscriptionId = subRow?.stripe_subscription_id as
      | string
      | null
      | undefined;
    const subStatus = subRow?.status as string | null | undefined;

    let stripeSubscriptionCanceled = false;

    if (
      subscriptionId &&
      subscriptionNeedsStripeCancel(subStatus)
    ) {
      if (!stripe) {
        logger.error("[me/delete] Stripe クライアントが無いのに有効なサブスク行がある", {
          userId,
        });
        return NextResponse.json(
          {
            error: "stripe_unavailable",
            message:
              "決済の設定が完了していないため退会を完了できません。サポートにお問い合わせください。",
          },
          { status: 503 },
        );
      }
      try {
        await cancelStripeSubscriptionForWithdrawal(stripe, subscriptionId);
        
        stripeSubscriptionCanceled = true;
        logger.info("[me/delete] 退会に伴う Stripe サブスク解約に成功", {
          userId,
          subscriptionId,
          subscriptionStatusBeforeCancel: subStatus,
        });
      } catch (e) {
        logger.errorException("[me/delete] Stripe サブスク解約に失敗", e, {
          userId,
          subscriptionId,
        });
        return NextResponse.json(
          {
            error: "stripe_cancel_failed",
            message:
              "プランの解約に失敗しました。しばらくしてから再度お試しください。",
          },
          { status: 502 },
        );
      }
    }

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

    logger.info("[me/delete] 退会処理完了（論理削除）", {
      userId,
      stripeSubscriptionCanceled,
      stripeSubscriptionId: subscriptionId ?? null,
    });

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
    res.cookies.set(COOKIE_WITHDRAWAL_COMPLETE, "1", {
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
