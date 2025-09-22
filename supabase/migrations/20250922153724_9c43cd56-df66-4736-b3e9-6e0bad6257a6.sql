-- Fix infinite recursion in pickups RLS policies
-- Drop the problematic policy that creates circular references
DROP POLICY IF EXISTS "Enhanced pickup access" ON public.pickups;

-- Create a simplified access policy that avoids circular references
CREATE POLICY "Drivers can access assigned pickups" ON public.pickups
FOR SELECT
USING (
  -- Admin, ops, and dispatchers can see all pickups in their org
  (EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND uo.organization_id = pickups.organization_id
    AND uo.role IN ('admin', 'ops_manager', 'dispatcher')
  ))
  OR
  -- Drivers can see pickups they're assigned to via assignments table (no circular ref)
  (EXISTS (
    SELECT 1 FROM assignments a
    JOIN users u ON u.id = a.driver_id
    WHERE u.auth_user_id = auth.uid()
    AND a.pickup_id = pickups.id
    AND a.organization_id = pickups.organization_id
  ))
  OR
  -- Clients can see their own pickups
  (EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    JOIN clients c ON c.id = pickups.client_id
    WHERE u.auth_user_id = auth.uid()
    AND uo.organization_id = pickups.organization_id
    AND uo.role = 'client'
    AND u.email = c.email
  ))
);

-- Create update policy for drivers to update pickups
CREATE POLICY "Drivers can update assigned pickups" ON public.pickups
FOR UPDATE
USING (
  -- Admin, ops, and dispatchers can update all pickups in their org
  (EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND uo.organization_id = pickups.organization_id
    AND uo.role IN ('admin', 'ops_manager', 'dispatcher')
  ))
  OR
  -- Drivers can update pickups they're assigned to
  (EXISTS (
    SELECT 1 FROM assignments a
    JOIN users u ON u.id = a.driver_id
    WHERE u.auth_user_id = auth.uid()
    AND a.pickup_id = pickups.id
    AND a.organization_id = pickups.organization_id
  ))
)
WITH CHECK (
  -- Same conditions for the check
  (EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND uo.organization_id = pickups.organization_id
    AND uo.role IN ('admin', 'ops_manager', 'dispatcher')
  ))
  OR
  (EXISTS (
    SELECT 1 FROM assignments a
    JOIN users u ON u.id = a.driver_id
    WHERE u.auth_user_id = auth.uid()
    AND a.pickup_id = pickups.id
    AND a.organization_id = pickups.organization_id
  ))
);