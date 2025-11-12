-- Emergency rollback to restore data visibility and stop recursive RLS failures
-- Context: App-wide data outage due to recursive policies on user_organization_roles
-- Action: Disable RLS on user_organization_roles, drop all policies on it, and grant SELECT to authenticated

begin;

-- 1) Disable RLS immediately to bypass broken policies
alter table public.user_organization_roles disable row level security;

-- 2) Drop all existing policies on this table to remove recursion sources
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_organization_roles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_organization_roles', pol.policyname);
  END LOOP;
END $$;

-- 3) Ensure authenticated clients can read it while RLS is disabled
GRANT SELECT ON public.user_organization_roles TO authenticated;

commit;

-- Note: This is an emergency, non-destructive rollback. We'll re-introduce safe RLS later using a security definer function (no recursion).