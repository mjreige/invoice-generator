-- Add signature columns to business_profiles table
ALTER TABLE business_profiles 
ADD COLUMN include_signature BOOLEAN DEFAULT false,
ADD COLUMN signature_name TEXT;
