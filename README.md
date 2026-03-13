## Invoice Generator (Next.js)

Simple, clean invoice generator built with Next.js. Fill out your details, add service line items, and generate a downloadable PDF invoice.

### Getting started

1. **Install dependencies**

```bash
npm install
```

2. **Run the dev server**

```bash
npm run dev
```

3. Open `http://localhost:3000` in your browser.

### Supabase setup (accounts & history)

1. In your Supabase project, create an `.env.local` file in the app root based on `.env.example` and fill in your project URL and anon key.
2. In Supabase SQL editor, create an `invoices` table:

```sql
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_number text,
  sender_name text,
  client_name text,
  due_date date,
  line_items jsonb,
  total numeric,
  created_at timestamptz not null default now()
);
```

3. Enable email/password authentication in Supabase Auth settings.

### Usage

- **Your name / business**: Who the invoice is from.
- **Client name**: Who the invoice is billed to.
- **Due date**: When the payment is due.
- **Services**: Add one or more line items with description and amount.
- Click **Generate PDF** to download a nicely formatted invoice PDF.


