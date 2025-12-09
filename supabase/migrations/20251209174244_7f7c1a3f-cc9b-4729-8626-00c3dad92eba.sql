-- Add ownership tracking to trailers table
ALTER TABLE public.trailers
ADD COLUMN ownership_type text DEFAULT 'owned' CHECK (ownership_type IN ('owned', 'rented')),
ADD COLUMN owner_name text;