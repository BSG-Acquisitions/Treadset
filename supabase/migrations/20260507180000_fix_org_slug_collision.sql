-- Onboarding hardening — CRITICAL #2 (2026-05-06 audit)
--
-- Problem: handle_new_user_organization() generates org slug as
--   email-prefix + first 8 chars of NEW.id (the auth user uuid).
-- With 8 hex chars (~4.3 billion space) and a per-email-prefix bucket,
-- birthday-paradox collisions become non-negligible at TreadSet's growth
-- targets. A collision causes the orgs INSERT to fail (UNIQUE on slug),
-- the trigger raises, signup completes in auth but the trigger's work is
-- not done, and the user has no org / no role / no recovery path without
-- admin intervention.
--
-- Fix: extend the entropy from 8 → 12 chars of the auth user uuid, plus
-- wrap the orgs INSERT in an EXCEPTION handler that retries with a fresh
-- gen_random_uuid()-based suffix on the unlikely UNIQUE violation.
-- Idempotent — replaces the function in place; no schema change.
--
-- Reverses: drop this migration's function definition or restore from
-- supabase/migrations/20251223154338_*.sql.

CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  org_slug TEXT;
  retry_count INT := 0;
BEGIN
  -- If this user was created as an employee by an admin, skip auto-org creation
  -- The edge function handles the users record and org role assignment directly
  IF (NEW.raw_user_meta_data->>'created_as_employee')::boolean = true THEN
    RETURN NEW;
  END IF;

  -- If this user was created via client portal invite, skip auto-org creation
  -- The claim_client_invite_token function handles org role assignment
  IF (NEW.raw_user_meta_data->>'created_as_client')::boolean = true THEN
    INSERT INTO public.users (auth_user_id, email, first_name, last_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name')
    ON CONFLICT (auth_user_id) DO NOTHING;

    RETURN NEW;
  END IF;

  -- Generate higher-entropy slug: email-prefix + 12 hex chars of auth user uuid
  org_slug := LOWER(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', '-')) || '-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 12);

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
    -- Create new organization with TreadSet branding.
    -- Belt-and-suspenders: retry with a fresh uuid-derived suffix on the
    -- (vanishingly unlikely) UNIQUE violation. Caps at 3 retries to avoid
    -- runaway loops if something else triggers the constraint.
    LOOP
      BEGIN
        INSERT INTO public.organizations (
          name,
          slug,
          logo_url,
          brand_primary_color,
          brand_secondary_color
        ) VALUES (
          'New Company',
          org_slug,
          '/treadset-logo.png',
          '#3b82f6',
          '#64748b'
        )
        RETURNING id INTO new_org_id;
        EXIT;  -- success
      EXCEPTION WHEN unique_violation THEN
        retry_count := retry_count + 1;
        IF retry_count > 3 THEN
          RAISE EXCEPTION 'Could not generate unique org slug after 3 retries (last attempted: %)', org_slug;
        END IF;
        org_slug := LOWER(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', '-')) || '-' || SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 12);
      END;
    END LOOP;

    -- Assign user as admin of the new organization
    INSERT INTO public.user_organization_roles (user_id, organization_id, role)
    SELECT u.id, new_org_id, 'admin'::app_role
    FROM public.users u
    WHERE u.auth_user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;
