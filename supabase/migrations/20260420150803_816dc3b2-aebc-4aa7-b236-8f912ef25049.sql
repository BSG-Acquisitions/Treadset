
-- Allow dispatchers (and ops_managers) to read users that share an organization with them
DROP POLICY IF EXISTS "Users can select own or admins select all" ON public.users;

CREATE POLICY "Users can select own or staff select org members"
ON public.users
FOR SELECT
TO authenticated
USING (
  ((SELECT auth.uid()) = auth_user_id)
  OR public.user_has_role('admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.user_organization_roles viewer_role
    JOIN public.users viewer ON viewer.id = viewer_role.user_id
    JOIN public.user_organization_roles target_role ON target_role.user_id = public.users.id
    WHERE viewer.auth_user_id = (SELECT auth.uid())
      AND viewer_role.role IN ('ops_manager', 'dispatcher')
      AND viewer_role.organization_id = target_role.organization_id
  )
);

-- Allow dispatchers (and ops_managers) to read user_organization_roles for users in their org
CREATE POLICY "Staff can view org member roles"
ON public.user_organization_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles viewer_role
    JOIN public.users viewer ON viewer.id = viewer_role.user_id
    WHERE viewer.auth_user_id = (SELECT auth.uid())
      AND viewer_role.role IN ('ops_manager', 'dispatcher')
      AND viewer_role.organization_id = public.user_organization_roles.organization_id
  )
);
