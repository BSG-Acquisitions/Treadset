-- First drop any views that depend on the type column
DROP VIEW IF EXISTS pickup_analytics CASCADE;

-- Remove the client type column from clients table since it's no longer needed
ALTER TABLE public.clients DROP COLUMN IF EXISTS type;

-- Remove any related enum types if they exist and are no longer used
DROP TYPE IF EXISTS client_type CASCADE;