import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { signupSchema } from "@/lib/validations/signup";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, lastName, firstName, phone, dateOfBirth } = body;

    // ---- Server-side validation ----
    const validation = signupSchema.safeParse({
      email,
      password,
      lastName,
      firstName,
      phone,
      dateOfBirth,
      termsAgreed: true, // already agreed in step 2
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || "入力内容に不備があります";
      return NextResponse.json(
        { error: firstError },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for user creation
    const supabase = createAdminClient();

    // ---- Check for existing user ----
    const { data: existingUsers } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 }
      );
    }

    // ---- Create Supabase Auth user ----
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for signup flow
    });

    if (authError || !authData.user) {
      console.error("Supabase auth error:", authError);

      // Handle duplicate email in Auth
      if (authError?.message?.includes("already") || authError?.message?.includes("duplicate")) {
        return NextResponse.json(
          { error: "このメールアドレスは既に登録されています" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: authError?.message || "ユーザー作成に失敗しました" },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // ---- Create user profile in public.users ----
    const { error: profileError } = await supabase.from("users").insert({
      id: userId,
      email,
      role: "member" as const,
      last_name: lastName,
      first_name: firstName,
      phone: phone || null,
      date_of_birth: dateOfBirth || null,
      terms_agreed_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Rollback: delete the auth user
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "プロフィールの作成に失敗しました。もう一度お試しください。" },
        { status: 500 }
      );
    }

    // ---- Create Stripe customer ----
    let stripe;
    try {
      stripe = getStripe();
    } catch (e) {
      console.error("Stripe initialization error:", e);
      // Rollback
      await supabase.from("users").delete().eq("id", userId);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "決済サービスの初期化に失敗しました" },
        { status: 503 }
      );
    }

    let customer;
    try {
      customer = await stripe.customers.create({
        email,
        name: `${lastName} ${firstName}`,
        phone: phone || undefined,
        metadata: {
          supabase_user_id: userId,
        },
      });
    } catch (e) {
      console.error("Stripe customer creation error:", e);
      // Rollback
      await supabase.from("users").delete().eq("id", userId);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "決済アカウントの作成に失敗しました。しばらくしてからお試しください。" },
        { status: 503 }
      );
    }

    // ---- Update user with Stripe customer ID ----
    await supabase
      .from("users")
      .update({ stripe_customer_id: customer.id })
      .eq("id", userId);

    // ---- Create Checkout Session ----
    const priceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    if (!priceId) {
      console.error("STRIPE_MONTHLY_PRICE_ID is not configured");
      return NextResponse.json(
        { error: "料金プランの設定に問題があります。管理者にお問い合わせください。" },
        { status: 500 }
      );
    }

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup/payment?canceled=true`,
        metadata: {
          supabase_user_id: userId,
        },
        subscription_data: {
          metadata: {
            supabase_user_id: userId,
          },
        },
        locale: "ja",
        allow_promotion_codes: true,
      });
    } catch (e) {
      console.error("Stripe Checkout Session creation error:", e);
      return NextResponse.json(
        { error: "決済セッションの作成に失敗しました。しばらくしてからお試しください。" },
        { status: 503 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました。しばらくしてからお試しください。" },
      { status: 500 }
    );
  }
}
