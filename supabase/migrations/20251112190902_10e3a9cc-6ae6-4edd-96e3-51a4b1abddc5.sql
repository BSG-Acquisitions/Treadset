-- Emergency unblock: ensure RLS subqueries can evaluate org membership
-- Allow all authenticated users to SELECT from user_organization_roles so other table policies can resolve
-- This is a temporary, additive policy to restore data visibility; we will tighten with a security definer function in a follow-up

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_organization_roles' 
      AND policyname = 'user_organization_roles_select_all_authenticated'
  ) THEN
    CREATE POLICY "user_organization_roles_select_all_authenticated"
    ON public.user_organization_roles
    FOR SELECT
    USING ((SELECT auth.uid()) IS NOT NULL);
  END IF;
END $$;

-- Note: keep existing manage policy as-is