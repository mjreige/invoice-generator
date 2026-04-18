-- Add tax fields to business_profiles table
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_label TEXT DEFAULT 'Tax';

-- Add tax tracking to invoices table (so history shows the correct applied tax)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0;
