-- Add unique constraint on stripe_subscription_id for upsert support in webhook handler
ALTER TABLE IF EXISTS subscriptions
  ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
