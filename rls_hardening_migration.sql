-- ============================================================
-- RLS hardening (applied manually in Supabase, July 2026)
-- Closes: (1) client self-escalation of plan/credits on `subscriptions`,
--         (2) cross-tenant read/write/delete via mis-scoped "manage all"
--             policies (TO public, USING true) on `subscriptions` + `invoices`.
-- Safe to re-run.
-- ============================================================

BEGIN;

-- (1) Remove client WRITE access to subscriptions. SELECT-own stays; only the
--     service role (webhook / cancel / refund routes) writes plan/status/credits.
DROP POLICY IF EXISTS "Users can update their own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON subscriptions;
REVOKE INSERT, UPDATE ON subscriptions FROM anon, authenticated;

-- (2) Drop the mis-scoped "manage all" policies. Named for the service role but
--     defined TO public with USING(true) -> full cross-tenant access for
--     anon/authenticated. The service_role key bypasses RLS and never needed them.
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage all invoices"      ON invoices;

-- Trim grants the client never legitimately uses.
REVOKE DELETE, TRUNCATE, TRIGGER, REFERENCES ON subscriptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON invoices FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON invoices FROM authenticated;
-- (authenticated keeps SELECT/INSERT/UPDATE/DELETE on invoices, gated to own rows
--  by the per-user policies.)

-- (3) Atomic, guarded credit consumption. SECURITY DEFINER so it works even
--     though the caller can no longer UPDATE subscriptions directly. Increments
--     credits_used by 1 only when a credit is actually available.
CREATE OR REPLACE FUNCTION consume_credit()
RETURNS TABLE (ok boolean, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits integer;
  v_used    integer;
  v_sub_id  text;
  v_status  text;
BEGIN
  SELECT invoice_credits, credits_used, paddle_subscription_id, status
    INTO v_credits, v_used, v_sub_id, v_status
  FROM subscriptions
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF v_sub_id IS NOT NULL AND v_status = 'active' THEN
    RETURN QUERY SELECT true, 2147483647;  -- active subscription = unlimited
    RETURN;
  END IF;

  IF COALESCE(v_credits,0) - COALESCE(v_used,0) <= 0 THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  UPDATE subscriptions
    SET credits_used = COALESCE(credits_used,0) + 1,
        updated_at   = now()
  WHERE user_id = auth.uid();

  RETURN QUERY SELECT true, (v_credits - v_used - 1);
END;
$$;

REVOKE ALL ON FUNCTION consume_credit() FROM public;
GRANT EXECUTE ON FUNCTION consume_credit() TO authenticated;

COMMIT;
