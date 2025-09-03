-- =============================================
-- Supabase Performance Fixes
-- - Optimize RLS policies to avoid per-row auth function initplans
-- - Consolidate organizations' policies to avoid multiple permissive SELECT policies
-- - Drop duplicate indexes flagged by Performance Advisor
-- =============================================

-- 1) ORGANIZATIONS: fix RLS and consolidate policies
DO $$
BEGIN
  -- Update SELECT policy to wrap auth.uid() calls
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='organizations' 
      AND policyname='Allow viewing organizations when authenticated or auth disabled'
  ) THEN
    EXECUTE $$
      ALTER POLICY "Allow viewing organizations when authenticated or auth disabled"
      ON public.organizations
      USING (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL));
    $$;
  END IF;

  -- Drop ALL policy and re-create for I/U/D only, to avoid multiple permissive SELECT policies
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='organizations' 
      AND policyname='Allow managing organizations when authenticated or auth disable'
  ) THEN
    EXECUTE $$
      DROP POLICY "Allow managing organizations when authenticated or auth disable" ON public.organizations;
    $$;

    -- INSERT
    EXECUTE $$
      CREATE POLICY "Allow inserting organizations when authenticated or auth disabled"
      ON public.organizations
      FOR INSERT
      USING (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL))
      WITH CHECK (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL));
    $$;

    -- UPDATE
    EXECUTE $$
      CREATE POLICY "Allow updating organizations when authenticated or auth disabled"
      ON public.organizations
      FOR UPDATE
      USING (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL))
      WITH CHECK (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL));
    $$;

    -- DELETE
    EXECUTE $$
      CREATE POLICY "Allow deleting organizations when authenticated or auth disabled"
      ON public.organizations
      FOR DELETE
      USING (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL));
    $$;
  END IF;
END $$;

-- 2) USERS: fix RLS auth wrapper
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='users' 
      AND policyname='Allow user operations when authenticated or auth disabled'
  ) THEN
    EXECUTE $$
      ALTER POLICY "Allow user operations when authenticated or auth disabled" 
      ON public.users
      USING (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL))
      WITH CHECK (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL));
    $$;
  END IF;
END $$;

-- 3) USER ORGANIZATION ROLES: fix RLS auth wrapper
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_organization_roles' 
      AND policyname='Allow access to user organization roles'
  ) THEN
    EXECUTE $$
      ALTER POLICY "Allow access to user organization roles"
      ON public.user_organization_roles
      USING (((select auth.uid()) IS NULL) OR (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.auth_user_id = (select auth.uid())
        )
      ));
    $$;
  END IF;
END $$;

-- 4) STANDARD ORG-SCOPED TABLES: fix RLS auth wrapper
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN SELECT * FROM (
    VALUES
      ('clients'::text, 'Users can access data in their organizations'::text),
      ('locations', 'Users can access data in their organizations'),
      ('pickups', 'Users can access data in their organizations'),
      ('vehicles', 'Users can access data in their organizations'),
      ('assignments', 'Users can access data in their organizations'),
      ('invoices', 'Users can access data in their organizations'),
      ('payments', 'Users can access data in their organizations'),
      ('pricing_tiers', 'Users can access data in their organizations'),
      ('client_summaries', 'Users can access data in their organizations'),
      ('price_matrix', 'Users can access data in their organizations'),
      ('surcharge_rules', 'Users can access data in their organizations'),
      ('client_pricing_overrides', 'Users can access data in their organizations'),
      ('location_pricing_overrides', 'Users can access data in their organizations'),
      ('price_versions', 'Users can access data in their organizations')
  ) AS t(tablename, policyname)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname='public' AND tablename=rec.tablename AND policyname=rec.policyname
    ) THEN
      EXECUTE format(
        'ALTER POLICY %I ON public.%I USING (((select auth.uid()) IS NULL) OR (organization_id IN (
           SELECT uo.organization_id FROM public.user_organization_roles uo
           JOIN public.users u ON uo.user_id = u.id
           WHERE u.auth_user_id = (select auth.uid())
        )));',
        rec.policyname, rec.tablename
      );
    END IF;
  END LOOP;
END $$;

-- 5) MANIFESTS (custom policy name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='manifests' 
      AND policyname='Users can access manifests in their organizations'
  ) THEN
    EXECUTE $$
      ALTER POLICY "Users can access manifests in their organizations"
      ON public.manifests
      USING (((select auth.uid()) IS NULL) OR (organization_id IN (
        SELECT uo.organization_id FROM public.user_organization_roles uo
        JOIN public.users u ON uo.user_id = u.id
        WHERE u.auth_user_id = (select auth.uid())
      )));
    $$;
  END IF;
END $$;

-- 6) CLIENT WORKFLOWS (custom policy name)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='client_workflows' 
      AND policyname='Users can access workflow data in their organizations'
  ) THEN
    EXECUTE $$
      ALTER POLICY "Users can access workflow data in their organizations"
      ON public.client_workflows
      USING (((select auth.uid()) IS NULL) OR (organization_id IN (
        SELECT uo.organization_id FROM public.user_organization_roles uo
        JOIN public.users u ON uo.user_id = u.id
        WHERE u.auth_user_id = (select auth.uid())
      )));
    $$;
  END IF;
END $$;

-- 7) USER PREFERENCES: fix auth wrappers in policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_preferences' 
      AND policyname='Users can view their own preferences'
  ) THEN
    EXECUTE $$
      ALTER POLICY "Users can view their own preferences" 
      ON public.user_preferences
      USING (((select auth.uid()) = user_id));
    $$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_preferences' 
      AND policyname='Users can create their own preferences'
  ) THEN
    EXECUTE $$
      ALTER POLICY "Users can create their own preferences" 
      ON public.user_preferences
      WITH CHECK (((select auth.uid()) = user_id));
    $$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='user_preferences' 
      AND policyname='Users can update their own preferences'
  ) THEN
    EXECUTE $$
      ALTER POLICY "Users can update their own preferences" 
      ON public.user_preferences
      USING (((select auth.uid()) = user_id));
    $$;
  END IF;
END $$;

-- 8) DROP DUPLICATE INDEXES
-- Keep the constraint-backed indexes (usually *_key) and drop redundant manual ones
DO $$
BEGIN
  -- invoices
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uidx_invoices_number') THEN
    EXECUTE 'DROP INDEX IF EXISTS public.uidx_invoices_number';
  END IF;

  -- locations
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_locations_active') THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_locations_active';
  END IF;

  -- manifests
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_manifests_org_number') THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_manifests_org_number';
  END IF;

  -- organizations
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uidx_organizations_slug') THEN
    EXECUTE 'DROP INDEX IF EXISTS public.uidx_organizations_slug';
  END IF;

  -- pickups
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_pickups_date') THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_pickups_date';
  END IF;

  -- user_preferences
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uidx_user_preferences_user') THEN
    EXECUTE 'DROP INDEX IF EXISTS public.uidx_user_preferences_user';
  END IF;
END $$;