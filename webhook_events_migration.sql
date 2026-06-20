-- Idempotency log for Paddle webhooks: each event_id is processed at most once,
-- so retried/duplicate deliveries can't double-credit or double-apply.
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Written to only by the webhook (service role). Enable RLS with no policies so
-- the anon/auth client can never read or write it.
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;
