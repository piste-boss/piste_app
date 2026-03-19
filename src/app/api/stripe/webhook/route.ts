import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

// Disable body parsing - we need the raw body for signature verification
export const dynamic = "force-dynamic";

/**
 * Extract the current billing period from a Stripe subscription.
 * Stripe API v2025+ uses items.data[0].current_period for period info.
 */
function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items?.data?.[0];
  const period = (item as unknown as Record<string, unknown>)
    ?.current_period as
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

/**
 * Get the Supabase user ID from a Stripe subscription's metadata.
 * Checks both subscription metadata and customer metadata as fallback.
 */
async function resolveUserId(
  stripe: Stripe,
  subscription: Stripe.Subscription
): Promise<string | null> {
  // Try subscription metadata first
  const userId = subscription.metadata?.supabase_user_id;
  if (userId) return userId;

  // Fallback: check customer metadata
  try {
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;

    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) {
        return (customer as Stripe.Customer).metadata?.supabase_user_id || null;
      }
    }
  } catch (e) {
    console.error("Failed to resolve user ID from customer:", e);
  }

  return null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    console.error("Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  let stripe: Stripe;
  let event: Stripe.Event;

  try {
    stripe = getStripe();
  } catch (e) {
    console.error("Stripe initialization error:", e);
    return NextResponse.json(
      { error: "Stripe initialization failed" },
      { status: 500 }
    );
  }

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      // ---- Checkout completed: create subscription record ----
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;

        if (!userId) {
          console.warn("checkout.session.completed: missing supabase_user_id in metadata");
          break;
        }

        if (!session.subscription) {
          console.warn("checkout.session.completed: no subscription in session");
          break;
        }

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;

        // Retrieve full subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const period = getSubscriptionPeriod(subscription);

        // Get price amount for the record
        const amount = subscription.items?.data?.[0]?.price?.unit_amount ?? null;

        // Upsert subscription record (idempotent)
        const { error: subError } = await supabase
          .from("subscriptions")
          .upsert(
            {
              member_id: userId,
              stripe_subscription_id: subscription.id,
              plan_name: "月額プラン",
              amount: amount ? amount / 100 : null, // Convert from cents to yen
              status: subscription.status,
              current_period_start: period.start,
              current_period_end: period.end,
            },
            { onConflict: "stripe_subscription_id" }
          );

        if (subError) {
          console.error("Failed to upsert subscription:", subError);
        }

        // Update user subscription status
        const { error: userError } = await supabase
          .from("users")
          .update({ subscription_status: "active" })
          .eq("id", userId);

        if (userError) {
          console.error("Failed to update user subscription status:", userError);
        }

        console.log(`checkout.session.completed: user=${userId}, sub=${subscription.id}`);
        break;
      }

      // ---- Invoice paid: confirm ongoing payments ----
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;

        const invoiceSubDetails = invoice.parent?.subscription_details;
        if (!invoiceSubDetails?.subscription) break;

        const subscriptionId =
          typeof invoiceSubDetails.subscription === "string"
            ? invoiceSubDetails.subscription
            : invoiceSubDetails.subscription.id;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const period = getSubscriptionPeriod(subscription);
        const userId = await resolveUserId(stripe, subscription);

        // Update subscription period
        const { error: subError } = await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_start: period.start,
            current_period_end: period.end,
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (subError) {
          console.error("Failed to update subscription on invoice.paid:", subError);
        }

        // Ensure user status is active
        if (userId) {
          await supabase
            .from("users")
            .update({ subscription_status: "active" })
            .eq("id", userId);
        }

        console.log(`invoice.paid: sub=${subscriptionId}`);
        break;
      }

      // ---- Invoice payment failed ----
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        const failedSubDetails = invoice.parent?.subscription_details;
        if (!failedSubDetails?.subscription) break;

        const subscriptionId =
          typeof failedSubDetails.subscription === "string"
            ? failedSubDetails.subscription
            : failedSubDetails.subscription.id;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = await resolveUserId(stripe, subscription);

        // Update subscription status
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", subscriptionId);

        if (userId) {
          await supabase
            .from("users")
            .update({ subscription_status: "past_due" })
            .eq("id", userId);
        }

        console.log(`invoice.payment_failed: sub=${subscriptionId}`);
        break;
      }

      // ---- Subscription updated ----
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const period = getSubscriptionPeriod(subscription);
        const userId = await resolveUserId(stripe, subscription);

        const { error: subError } = await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_start: period.start,
            current_period_end: period.end,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (subError) {
          console.error("Failed to update subscription:", subError);
        }

        // Sync user status
        if (userId) {
          const mappedStatus =
            subscription.status === "active" || subscription.status === "trialing"
              ? "active"
              : subscription.status === "canceled" || subscription.status === "unpaid"
                ? "canceled"
                : "past_due";

          await supabase
            .from("users")
            .update({ subscription_status: mappedStatus })
            .eq("id", userId);
        }

        console.log(`customer.subscription.updated: sub=${subscription.id}, status=${subscription.status}`);
        break;
      }

      // ---- Subscription deleted/canceled ----
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(stripe, subscription);

        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);

        if (userId) {
          await supabase
            .from("users")
            .update({ subscription_status: "canceled" })
            .eq("id", userId);
        }

        console.log(`customer.subscription.deleted: sub=${subscription.id}`);
        break;
      }

      default: {
        // Log unhandled event types for debugging
        console.log(`Unhandled Stripe event: ${event.type}`);
      }
    }
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    // Return 200 even on processing errors to prevent Stripe retries
    // for events we've already received
    return NextResponse.json(
      { received: true, error: "Processing error" },
      { status: 200 }
    );
  }

  return NextResponse.json({ received: true });
}
