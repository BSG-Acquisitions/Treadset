-- Fix haulers table RLS to allow drivers to view haulers
-- Drivers need to see haulers to create manifests

-- Drop existing select policy
DROP POLICY IF EXISTS "haulers_select" ON public.haulers;

-- Create new select policy that includes drivers
CREATE POLICY "haulers_select" 
ON public.haulers 
FOR SELECT 
USING (
  -- Independent haulers can see their own record
  user_id IN (
    SELECT users.id 
    FROM users 
    WHERE users.auth_user_id = auth.uid()
  ) 
  OR 
  -- Staff (admin, ops_manager, dispatcher, driver) can see all haulers in their org
  EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid() 
    AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role, 'driver'::app_role])
  )
);