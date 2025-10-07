-- Add all roles to admin user for testing
-- This allows admins to view all portal pages

DO $$
DECLARE
  admin_user_id UUID;
  org_id UUID;
BEGIN
  -- Get the user ID for oaklandreds20@gmail.com
  SELECT u.id, uo.organization_id INTO admin_user_id, org_id
  FROM public.users u
  JOIN public.user_organization_roles uo ON u.id = uo.user_id
  WHERE u.email = 'oaklandreds20@gmail.com' AND uo.role = 'admin'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    -- Add all roles to this user (ON CONFLICT DO NOTHING to avoid errors)
    INSERT INTO public.user_organization_roles (user_id, organization_id, role)
    VALUES 
      (admin_user_id, org_id, 'ops_manager'),
      (admin_user_id, org_id, 'dispatcher'),
      (admin_user_id, org_id, 'driver'),
      (admin_user_id, org_id, 'sales'),
      (admin_user_id, org_id, 'client')
    ON CONFLICT (user_id, organization_id, role) DO NOTHING;
    
    RAISE NOTICE 'Added all roles to user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'Admin user not found';
  END IF;
END $$;