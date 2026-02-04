-- Fix user ID mismatch for zachdevon@bsgtires.com
-- The auth.users ID (70c2f0d6-d1db-40ad-98fa-1def1c314b0d) doesn't match
-- the user_organization_roles user_id (1c39d6ae-c319-47a8-96ed-a58de61d13ee)

-- First, ensure the correct auth user exists in the users table
INSERT INTO public.users (id, email, first_name, last_name, phone)
SELECT 
  '70c2f0d6-d1db-40ad-98fa-1def1c314b0d',
  'zachdevon@bsgtires.com',
  'Zachariah',
  'Devon',
  '7344156528'
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE id = '70c2f0d6-d1db-40ad-98fa-1def1c314b0d'
);

-- Copy the organization roles from the old user ID to the new auth user ID
INSERT INTO public.user_organization_roles (user_id, organization_id, role)
SELECT 
  '70c2f0d6-d1db-40ad-98fa-1def1c314b0d',
  organization_id,
  role
FROM public.user_organization_roles
WHERE user_id = '1c39d6ae-c319-47a8-96ed-a58de61d13ee'
ON CONFLICT (user_id, organization_id, role) DO NOTHING;