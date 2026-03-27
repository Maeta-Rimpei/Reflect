import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isSupabaseAdminConfigured } from "@/lib/supabase-admin";
import { stripe, isStripeConfigured, STRIPE_DEEP_PRICE_ID } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured()) {
    logger.warn("[stripe create-checkout-session] 503: Supabase が未設定です");
    return NextResponse.json(
      { error: "unavailable", message: "Supabase is not configured" },
      { status: 503 },
    );
  }

  if (!isStripeConfigured() || !stripe) {
    logger.warn("[stripe create-checkout-session] 503: Stripe が未設定です");
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
  const email = session.user.email ?? undefined;

  try {
    const origin = req.headers.get("origin") ?? req.nextUrl.origin;
    const successUrl = `${origin}/settings?success=1&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/settings?canceled=1`;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: STRIPE_DEEP_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        user_id: userId,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
        },
      },
      ...(email ? { customer_email: email } : {}),
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "internal", message: "Failed to create checkout URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    logger.errorException("[stripe create-checkout-session] チェックアウトセッション作成でエラー", e, {
      userId,
    });
    return NextResponse.json(
      { error: "internal", message: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
