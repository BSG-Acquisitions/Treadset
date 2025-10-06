-- Add collection site registration number field to receivers table
ALTER TABLE public.receivers 
ADD COLUMN IF NOT EXISTS collection_site_reg TEXT;