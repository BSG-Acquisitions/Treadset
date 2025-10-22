-- Add signature storage to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS signature_data_url text;