-- Add custom invoice numbering template support (Business plan) to business_profiles
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS invoice_number_template JSONB DEFAULT NULL;

-- Shape of invoice_number_template:
-- {
--   "enabled": boolean,         -- whether the template is in use
--   "prefix": text,             -- e.g. "ACME"
--   "template": text,           -- e.g. "{PREFIX}-{YYYY}-{SEQ:4}"
--   "allow_override": boolean,  -- whether the invoice_number field can be hand-edited per invoice
--   "last_year": integer,       -- calendar year the sequence was last issued in
--   "last_seq": integer         -- last sequence number issued (resets to 0 on a new year)
-- }
