-- Tracks which lifecycle emails each user has already received, so the cron
-- sends each one at most once. Written only by the service role (the cron).
CREATE TABLE IF NOT EXISTS lifecycle_emails (
  user_id           UUID PRIMARY KEY,
  welcome_sent_at    TIMESTAMPTZ,
  activation_sent_at TIMESTAMPTZ,
  upgrade_sent_at    TIMESTAMPTZ
);

-- RLS on with no policies: anon/authenticated clients can never read or write it.
ALTER TABLE lifecycle_emails ENABLE ROW LEVEL SECURITY;
