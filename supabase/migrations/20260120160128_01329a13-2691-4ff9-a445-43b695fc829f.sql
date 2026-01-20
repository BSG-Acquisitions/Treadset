-- Step 1: Create a SECURITY DEFINER function to check org roles
-- This bypasses RLS on user_organization_roles
CREATE OR REPLACE FUNCTION public.user_has_org_role(
  org_id uuid, 
  allowed_roles app_role[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_organization_roles uo
    JOIN public.users u ON (uo.user_id = u.id)
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = org_id
      AND uo.role = ANY(allowed_roles)
  );
$$;

-- Step 2: Update pickups INSERT policy to use the function
DROP POLICY IF EXISTS "Enhanced pickup insert" ON pickups;

CREATE POLICY "Enhanced pickup insert" ON pickups
  FOR INSERT
  WITH CHECK (
    public.user_has_org_role(
      organization_id,
      ARRAY['admin', 'ops_manager', 'dispatcher', 'driver']::app_role[]
    )
  );

-- Step 3: Update assignments INSERT policy to use the function
DROP POLICY IF EXISTS "assignments_insert_policy" ON assignments;

CREATE POLICY "assignments_insert_policy" ON assignments
  FOR INSERT
  WITH CHECK (
    public.user_has_org_role(
      organization_id,
      ARRAY['admin', 'ops_manager', 'dispatcher', 'driver']::app_role[]
    )
  );