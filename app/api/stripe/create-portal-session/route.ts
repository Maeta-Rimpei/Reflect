import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase-admin";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { logger } from "@/lib/logger";

/**
 * Create a Stripe Customer Portal session for the current user.
 * Used for managing subscription (cancel, update payment method) and viewing invoices.
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "unavailable", message: "Supabase is not configured" },
      { status: 503 },
    );
  }

  if (!isStripeConfigured() || !stripe) {
    return NextResponse.json(
      { error: "unavailable", message: "Stripe is not configured" },
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

    const { data: subRow } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    const customerId = subRow?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: "not_found", message: "Stripe customer not found" },
        { status: 404 },
      );
    }

    const origin = req.headers.get("origin") ?? req.nextUrl.origin;
    const returnUrl = `${origin}/settings`;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    logger.errorException("[stripe create-portal-session] ポータルセッション作成でエラー", e, {
      userId,
    });
    return NextResponse.json(
      { error: "internal", message: "プラン管理ページを開けませんでした。しばらくしてからもう一度お試しください。" },
      { status: 500 },
    );
  }
}
