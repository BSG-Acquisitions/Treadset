-- Add missing signature timestamp columns to manifests table
ALTER TABLE public.manifests 
ADD COLUMN IF NOT EXISTS generator_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hauler_signed_at TIMESTAMP WITH TIME ZONE;