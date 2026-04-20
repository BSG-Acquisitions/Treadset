DROP POLICY IF EXISTS driver_capabilities_select ON public.driver_capabilities;

CREATE POLICY driver_capabilities_select
ON public.driver_capabilities
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_organization_roles uor
    JOIN public.users u ON u.id = uor.user_id
    WHERE u.auth_user_id = auth.uid()
      AND uor.role IN ('admin', 'ops_manager', 'dispatcher')
  )
);