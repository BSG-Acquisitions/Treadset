-- Fix invite records to show the 5 users who signed up via migration
-- Update used_at and used_by based on matching client_users records

UPDATE public.client_invites ci
SET 
  used_at = cu.created_at,
  used_by = cu.user_id,
  updated_at = now()
FROM public.client_users cu
WHERE ci.client_id = cu.client_id
  AND ci.used_at IS NULL;