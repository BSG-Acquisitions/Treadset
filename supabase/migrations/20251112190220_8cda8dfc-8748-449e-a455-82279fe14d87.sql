
-- Fix recursive RLS policy on user_organization_roles that causes 406 errors
-- The existing policy checks users table, which creates circular dependency when embedding user_organization_roles in users query

DROP POLICY IF EXISTS "Allow authenticated access to user organization roles" ON public.user_organization_roles;

-- Allow users to read their own organization roles, or admins to read all
CREATE POLICY "user_organization_roles_select"
ON public.user_organization_roles
FOR SELECT
USING (
  -- Users can see their own roles
  user_id IN (SELECT id FROM public.users WHERE auth_user_id = (SELECT auth.uid()))
  OR
  -- Admins can see all roles
  EXISTS (
    SELECT 1 FROM public.user_organization_roles uo2
    JOIN public.users u ON uo2.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
    AND uo2.role = 'admin'::app_role
  )
);

-- Allow authenticated users to manage their own organization roles
CREATE POLICY "user_organization_roles_manage"
ON public.user_organization_roles
FOR ALL
USING (
  -- Only admins can insert/update/delete
  EXISTS (
    SELECT 1 FROM public.user_organization_roles uo2
    JOIN public.users u ON uo2.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
    AND uo2.role = 'admin'::app_role
  )
);
