-- Real-time founder notifications on signup + email verification.
-- Triggers on auth.users call the /api/admin/notify endpoint via pg_net (async).
-- Auth uses your CRON_SECRET — REPLACE the placeholder below before running.
-- Safe to re-run.

-- pg_net is preinstalled on Supabase; this is a no-op if already enabled.
create extension if not exists pg_net;

-- ── Signup: fires when a new auth.users row is created ──────────────
create or replace function public.notify_admin_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url     := 'https://invoices.ncgmgroup.com/api/admin/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    ),
    body    := jsonb_build_object('type', 'signup', 'email', NEW.email)
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_admin_signup on auth.users;
create trigger trg_notify_admin_signup
after insert on auth.users
for each row execute function public.notify_admin_on_signup();

-- ── Verified: fires when email_confirmed_at goes from empty to set ──
create or replace function public.notify_admin_on_verify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if OLD.email_confirmed_at is null and NEW.email_confirmed_at is not null then
    perform net.http_post(
      url     := 'https://invoices.ncgmgroup.com/api/admin/notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
      ),
      body    := jsonb_build_object('type', 'verified', 'email', NEW.email)
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_admin_verify on auth.users;
create trigger trg_notify_admin_verify
after update on auth.users
for each row execute function public.notify_admin_on_verify();
