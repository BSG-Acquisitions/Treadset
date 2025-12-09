-- Remove the check constraint to allow free-text ownership types
ALTER TABLE public.trailers DROP CONSTRAINT IF EXISTS trailers_ownership_type_check;