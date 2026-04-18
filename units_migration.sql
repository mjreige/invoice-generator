-- Add custom_units to business_profiles (available to all plans)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS custom_units JSONB DEFAULT '["hrs","days","pcs","kg","km","months","words","pages"]'::jsonb;
