-- Add saved customers list to business_profiles
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS saved_customers JSONB DEFAULT '[]'::jsonb;

-- Add full client detail columns to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS client_email TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS client_phone TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS client_address TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS client_city TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS client_country TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS client_tax_id TEXT DEFAULT '';
