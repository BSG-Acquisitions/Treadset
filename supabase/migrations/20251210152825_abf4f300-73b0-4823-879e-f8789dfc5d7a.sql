-- Step 1: Update the trigger function to skip org creation for employees
CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  org_slug TEXT;
BEGIN
  -- If this user was created as an employee by an admin, skip auto-org creation
  -- The edge function handles the users record and org role assignment directly
  IF (NEW.raw_user_meta_data->>'created_as_employee')::boolean = true THEN
    RETURN NEW;
  END IF;

  -- Generate a unique slug from email
  org_slug := LOWER(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', '-')) || '-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
  
  -- Create user record in public.users table
  INSERT INTO public.users (auth_user_id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name')
  ON CONFLICT (auth_user_id) DO NOTHING;
  
  -- Check if user already has an organization
  IF NOT EXISTS (
    SELECT 1 FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = NEW.id
  ) THEN
    -- Create new organization with TreadSet branding
    INSERT INTO public.organizations (
      name,
      slug,
      logo_url,
      brand_primary_color,
      brand_secondary_color
    ) VALUES (
      'New Company', -- Placeholder, will be updated in onboarding
      org_slug,
      '/treadset-logo.png',
      '#3b82f6',
      '#64748b'
    )
    RETURNING id INTO new_org_id;
    
    -- Assign user as admin of the new organization
    INSERT INTO public.user_organization_roles (user_id, organization_id, role)
    SELECT u.id, new_org_id, 'admin'::app_role
    FROM public.users u
    WHERE u.auth_user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Step 2: Fix Jody Green's organization assignment
-- First, find Jody's user_id
DO $$
DECLARE
  jody_user_id UUID;
  bsg_org_id UUID := 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73';
BEGIN
  -- Get Jody's user_id
  SELECT id INTO jody_user_id 
  FROM public.users 
  WHERE email = 'genesissolutionsco@gmail.com';
  
  IF jody_user_id IS NOT NULL THEN
    -- Delete any existing roles for Jody (in wrong orgs)
    DELETE FROM public.user_organization_roles 
    WHERE user_id = jody_user_id;
    
    -- Add Jody to BSG Logistics with admin role
    INSERT INTO public.user_organization_roles (user_id, organization_id, role)
    VALUES (jody_user_id, bsg_org_id, 'admin'::app_role)
    ON CONFLICT (user_id, organization_id, role) DO NOTHING;
    
    RAISE NOTICE 'Successfully moved Jody Green to BSG Logistics';
  ELSE
    RAISE NOTICE 'Jody Green user record not found';
  END IF;
END $$;

-- Step 3: Clean up orphaned organizations (no users assigned)
DELETE FROM public.organizations 
WHERE id IN ('1a83a1e0-a78d-4ef7-8966-955bb631e4d0', 'd947b73b-df9f-4a83-8e19-2cb9a5b950db')
AND NOT EXISTS (
  SELECT 1 FROM public.user_organization_roles 
  WHERE organization_id = organizations.id
);