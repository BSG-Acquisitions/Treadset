-- Insert the missing user record
INSERT INTO public.users (auth_user_id, email, first_name, last_name)
VALUES ('70c2f0d6-d1db-40ad-98fa-1def1c314b0d', 'zachdevon@bsgtires.com', 'Zach', 'Devon');

-- Also need to give the user a role in an organization
-- First check if BSG organization exists, if not create it
INSERT INTO public.organizations (id, name, slug, created_at, updated_at)
VALUES (gen_random_uuid(), 'BSG Logistics', 'bsg', NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Get the user ID and organization ID for the role assignment
WITH user_data AS (
  SELECT id as user_id FROM public.users WHERE auth_user_id = '70c2f0d6-d1db-40ad-98fa-1def1c314b0d'
),
org_data AS (
  SELECT id as org_id FROM public.organizations WHERE slug = 'bsg'
)
INSERT INTO public.user_organization_roles (user_id, organization_id, role)
SELECT user_data.user_id, org_data.org_id, 'admin'
FROM user_data, org_data;