
-- Add check_number column to pickups table
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS check_number text;

-- Add check_number column to manifests table
ALTER TABLE public.manifests ADD COLUMN IF NOT EXISTS check_number text;
