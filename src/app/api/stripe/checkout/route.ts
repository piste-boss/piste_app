import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, lastName, firstName, phone, dateOfBirth } = body;

    // Create Supabase user
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "ユーザー作成に失敗しました" },
        { status: 400 }
      );
    }

    // Create user profile
    await supabase.from("users").insert({
      id: authData.user.id,
      email,
      role: "member" as const,
      last_name: lastName,
      first_name: firstName,
      phone: phone || null,
      date_of_birth: dateOfBirth || null,
      terms_agreed_at: new Date().toISOString(),
    });

    // Create Stripe customer
    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email,
      name: `${lastName} ${firstName}`,
      metadata: { supabase_user_id: authData.user.id },
    });

    // Update user with Stripe customer ID
    await supabase
      .from("users")
      .update({ stripe_customer_id: customer.id })
      .eq("id", authData.user.id);

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_MONTHLY_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/member-dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup/payment`,
      metadata: { supabase_user_id: authData.user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "決済の初期化に失敗しました" },
      { status: 500 }
    );
  }
}
