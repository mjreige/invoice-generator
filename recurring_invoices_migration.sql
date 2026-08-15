-- Scheduled / recurring invoices (Business subscription feature, Path A:
-- the schedule auto-GENERATES an invoice each period and notifies the user to
-- review & send — it does NOT auto-email the client's PDF).
--
-- The `template` JSONB holds the invoice payload to reproduce each period
-- (sender/client details, line_items, discount, tax, currency, etc.).

create table if not exists recurring_invoices (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null,
  source_invoice_id  uuid,
  client_name        text,
  template           jsonb not null,
  frequency          text not null check (frequency in ('weekly','monthly','quarterly','yearly')),
  due_days           integer not null default 0,   -- days after generation for the due date
  start_date         date not null,
  next_run_date      date not null,
  end_date           date,                          -- optional; null = no end
  status             text not null default 'active' check (status in ('active','paused','completed')),
  last_generated_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_recurring_user on recurring_invoices(user_id);
create index if not exists idx_recurring_due on recurring_invoices(status, next_run_date);

alter table recurring_invoices enable row level security;

-- Users manage only their own schedules. The cron uses the service role
-- (bypasses RLS) to generate invoices from them.
drop policy if exists "Users can view their own recurring invoices" on recurring_invoices;
create policy "Users can view their own recurring invoices"
  on recurring_invoices for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own recurring invoices" on recurring_invoices;
create policy "Users can insert their own recurring invoices"
  on recurring_invoices for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own recurring invoices" on recurring_invoices;
create policy "Users can update their own recurring invoices"
  on recurring_invoices for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own recurring invoices" on recurring_invoices;
create policy "Users can delete their own recurring invoices"
  on recurring_invoices for delete using (auth.uid() = user_id);

grant select, insert, update, delete on recurring_invoices to authenticated;
