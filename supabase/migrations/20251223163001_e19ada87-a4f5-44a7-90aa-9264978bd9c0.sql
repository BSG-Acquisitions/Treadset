-- Upgrade Kathy Taylor to primary contact for Crest Ford
UPDATE public.client_users 
SET role = 'primary', updated_at = now()
WHERE id = '6b6b7c14-1968-44dd-a576-6c4fd7b6ef9e';