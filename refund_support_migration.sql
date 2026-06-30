-- Track when the user's most recent purchase happened, so the refund-request
-- flow can enforce the 30-day window. Set by the Paddle webhook on each purchase.
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS last_purchase_at TIMESTAMPTZ;
