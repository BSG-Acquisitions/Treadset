-- Add address fields to clients table for generator information
ALTER TABLE public.clients 
ADD COLUMN mailing_address text,
ADD COLUMN city text,
ADD COLUMN state text,
ADD COLUMN zip text,
ADD COLUMN physical_address text,
ADD COLUMN physical_city text,
ADD COLUMN physical_state text,
ADD COLUMN physical_zip text,
ADD COLUMN county text;