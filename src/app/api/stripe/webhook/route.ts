import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  // Stripe v4+ uses items.data[0].current_period
  const item = subscription.items?.data?.[0];
  const period = (item as unknown as Record<string, unknown>)?.current_period as
    | { start: number; end: number }
    | undefined;
  return {
    start: period?.start
      ? new Date(period.start * 1000).toISOString()
      : null,
    end: period?.end
      ? new Date(period.end * 1000).toISOString()
      : null,
  };
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature")!;

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (userId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const period = getSubscriptionPeriod(subscription);
        await supabase.from("subscriptions").insert({
          member_id: userId,
          stripe_subscription_id: subscription.id,
          plan_name: "月額プラン",
          status: subscription.status,
          current_period_start: period.start,
          current_period_end: period.end,
        });
        await supabase
          .from("users")
          .update({ subscription_status: "active" })
          .eq("id", userId);
      }
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const period = getSubscriptionPeriod(subscription);
      await supabase
        .from("subscriptions")
        .update({
          status: subscription.status,
          current_period_start: period.start,
          current_period_end: period.end,
        })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", subscription.id);

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("member_id")
        .eq("stripe_subscription_id", subscription.id)
        .single();
      if (sub) {
        await supabase
          .from("users")
          .update({ subscription_status: "canceled" })
          .eq("id", sub.member_id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
