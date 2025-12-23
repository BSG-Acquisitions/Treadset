-- Update the handle_new_user_organization function to skip org creation for client portal signups
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

  -- If this user was created via client portal invite, skip auto-org creation
  -- The claim_client_invite_token function handles org role assignment
  IF (NEW.raw_user_meta_data->>'created_as_client')::boolean = true THEN
    -- Just create the user record, don't create an organization
    INSERT INTO public.users (auth_user_id, email, first_name, last_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name')
    ON CONFLICT (auth_user_id) DO NOTHING;
    
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