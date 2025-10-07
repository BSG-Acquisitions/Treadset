-- Drop the constraint that prevents multiple roles per user per organization
ALTER TABLE public.user_organization_roles 
DROP CONSTRAINT IF EXISTS user_organization_roles_user_id_organization_id_key;

-- Now add all roles to zachdevon@bsgtires.com
DO $$
DECLARE
  admin_user_id UUID;
  org_id UUID;
BEGIN
  SELECT u.id, uo.organization_id INTO admin_user_id, org_id
  FROM public.users u
  JOIN public.user_organization_roles uo ON u.id = uo.user_id
  WHERE u.email = 'zachdevon@bsgtires.com'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_organization_roles (user_id, organization_id, role)
    VALUES 
      (admin_user_id, org_id, 'ops_manager'),
      (admin_user_id, org_id, 'dispatcher'),
      (admin_user_id, org_id, 'driver'),
      (admin_user_id, org_id, 'sales'),
      (admin_user_id, org_id, 'client')
    ON CONFLICT (user_id, organization_id, role) DO NOTHING;
  END IF;
END $$;