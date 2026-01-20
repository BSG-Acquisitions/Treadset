-- Step 1: Remove the dispatcher role from Brenner
DELETE FROM user_organization_roles 
WHERE user_id = 'a77a6f42-5647-46c9-8a6a-98ad5bcbd68b' 
  AND role = 'dispatcher';

-- Step 2: Update pickups INSERT policy to include driver role
DROP POLICY IF EXISTS "Enhanced pickup insert" ON pickups;

CREATE POLICY "Enhanced pickup insert" ON pickups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organization_roles uo
      JOIN users u ON (uo.user_id = u.id)
      WHERE u.auth_user_id = auth.uid()
        AND uo.organization_id = pickups.organization_id
        AND uo.role = ANY (ARRAY['admin', 'ops_manager', 'dispatcher', 'driver']::app_role[])
    )
  );

-- Step 3: Update assignments INSERT policy to include driver role
DROP POLICY IF EXISTS "assignments_insert_policy" ON assignments;

CREATE POLICY "assignments_insert_policy" ON assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organization_roles uo
      JOIN users u ON (uo.user_id = u.id)
      WHERE u.auth_user_id = auth.uid()
        AND uo.organization_id = assignments.organization_id
        AND uo.role = ANY (ARRAY['admin', 'ops_manager', 'dispatcher', 'driver']::app_role[])
    )
  );