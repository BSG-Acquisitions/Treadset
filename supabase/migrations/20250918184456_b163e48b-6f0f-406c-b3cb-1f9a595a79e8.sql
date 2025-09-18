-- Final fix for pickups table - make service role policy restrictive
-- This will eliminate the remaining multiple permissive policies

-- Drop the current policies
DROP POLICY IF EXISTS "Pickups access control" ON public.pickups;
DROP POLICY IF EXISTS "Pickups select access" ON public.pickups;

-- Create a single restrictive policy for service role access
CREATE POLICY "Service role pickups access" ON public.pickups
AS RESTRICTIVE FOR ALL 
TO service_role 
USING (true) WITH CHECK (true);

-- Create the main policy for users with proper auth optimization
CREATE POLICY "Users access pickups" ON public.pickups
FOR ALL USING (
  -- Organization staff can manage all
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
    AND uo.organization_id = pickups.organization_id
    AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
  )
  OR
  -- Clients can view their own pickups (SELECT only in practice)
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    JOIN clients c ON c.id = pickups.client_id
    WHERE u.auth_user_id = (SELECT auth.uid())
    AND uo.organization_id = pickups.organization_id
    AND uo.role = 'client'::app_role
    AND u.email = c.email
  )
  OR
  -- Drivers can view assigned pickups (SELECT only in practice)
  EXISTS (
    SELECT 1 FROM manifests m
    JOIN users u ON u.id = m.driver_id
    WHERE u.auth_user_id = (SELECT auth.uid())
    AND m.pickup_id = pickups.id
    AND m.organization_id = pickups.organization_id
  )
) WITH CHECK (
  -- Only organization staff can insert/update/delete
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
    AND uo.organization_id = pickups.organization_id
    AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
  )
);