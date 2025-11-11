-- Continue consolidating multiple permissive policies (Part 2)

-- hauler_customers: Consolidate SELECT policies
DROP POLICY IF EXISTS "Haulers view own customers" ON public.hauler_customers;
DROP POLICY IF EXISTS "Haulers manage own customers" ON public.hauler_customers;
DROP POLICY IF EXISTS "Admins view all hauler customers" ON public.hauler_customers;
CREATE POLICY "hauler_customers_select_policy" ON public.hauler_customers
  FOR SELECT
  USING (
    -- Haulers view own customers
    hauler_id IN (
      SELECT haulers.id
      FROM haulers
      WHERE haulers.user_id IN (
        SELECT users.id
        FROM users
        WHERE users.auth_user_id = (SELECT auth.uid())
      )
    )
    OR
    -- Admins view all
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role])
    )
  );

CREATE POLICY "hauler_customers_manage_policy" ON public.hauler_customers
  FOR ALL
  USING (
    hauler_id IN (
      SELECT haulers.id
      FROM haulers
      WHERE haulers.user_id IN (
        SELECT users.id
        FROM users
        WHERE users.auth_user_id = (SELECT auth.uid())
      )
    )
  );

-- haulers: Consolidate SELECT policies
DROP POLICY IF EXISTS "Haulers view own profile" ON public.haulers;
DROP POLICY IF EXISTS "Org view haulers" ON public.haulers;
DROP POLICY IF EXISTS "Admins manage haulers" ON public.haulers;
DROP POLICY IF EXISTS "Authenticated users can manage haulers" ON public.haulers;
CREATE POLICY "haulers_select_policy" ON public.haulers
  FOR SELECT
  USING (
    -- Haulers view own profile
    user_id IN (
      SELECT users.id
      FROM users
      WHERE users.auth_user_id = (SELECT auth.uid())
    )
    OR
    -- Org view haulers
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
    )
  );

CREATE POLICY "haulers_manage_policy" ON public.haulers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role])
    )
  );

-- facility_hauler_rates: Consolidate policies
DROP POLICY IF EXISTS "Org view rates" ON public.facility_hauler_rates;
DROP POLICY IF EXISTS "Admins manage rates" ON public.facility_hauler_rates;
CREATE POLICY "facility_hauler_rates_select_policy" ON public.facility_hauler_rates
  FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "facility_hauler_rates_manage_policy" ON public.facility_hauler_rates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = facility_hauler_rates.organization_id
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role])
    )
  );

-- dropoffs: Consolidate policies
DROP POLICY IF EXISTS "Haulers manage dropoffs" ON public.dropoffs;
DROP POLICY IF EXISTS "Org members can manage dropoffs" ON public.dropoffs;
CREATE POLICY "dropoffs_policy" ON public.dropoffs
  FOR ALL
  USING (
    -- Haulers manage their dropoffs
    hauler_id IN (
      SELECT haulers.id
      FROM haulers
      WHERE haulers.user_id IN (
        SELECT users.id
        FROM users
        WHERE users.auth_user_id = (SELECT auth.uid())
      )
    )
    OR
    -- Org members can manage all
    (
      (SELECT auth.uid()) IS NOT NULL
      AND organization_id IN (
        SELECT uo.organization_id
        FROM user_organization_roles uo
        JOIN users u ON uo.user_id = u.id
        WHERE u.auth_user_id = (SELECT auth.uid())
      )
    )
  );

-- pickups: Consolidate SELECT policies for org members and drivers
DROP POLICY IF EXISTS "Enhanced pickup select" ON public.pickups;
DROP POLICY IF EXISTS "Org members can read pickups" ON public.pickups;
DROP POLICY IF EXISTS "Drivers can access assigned pickups" ON public.pickups;
CREATE POLICY "pickups_select_policy" ON public.pickups
  FOR SELECT
  USING (
    -- Org members can read
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = pickups.organization_id
    )
    OR
    -- Drivers can access assigned pickups
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = pickups.organization_id
        AND uo.role = 'driver'::app_role
        AND u.id IN (
          SELECT driver_id FROM assignments WHERE pickup_id = pickups.id
        )
    )
  );

-- pickups: Consolidate UPDATE policies
DROP POLICY IF EXISTS "Org members can update pickups" ON public.pickups;
DROP POLICY IF EXISTS "Drivers can update assigned pickups" ON public.pickups;
CREATE POLICY "pickups_update_policy" ON public.pickups
  FOR UPDATE
  USING (
    -- Org members can update
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = pickups.organization_id
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
    )
    OR
    -- Drivers can update assigned pickups
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = pickups.organization_id
        AND uo.role = 'driver'::app_role
        AND u.id IN (
          SELECT driver_id FROM assignments WHERE pickup_id = pickups.id
        )
    )
  );

-- assignments: Consolidate SELECT policies
DROP POLICY IF EXISTS "Users can view assignments" ON public.assignments;
DROP POLICY IF EXISTS "Service role can access assignments" ON public.assignments;
CREATE POLICY "assignments_select_policy" ON public.assignments
  FOR SELECT
  USING (
    current_setting('role') = 'service_role'
    OR
    -- Admins, ops, dispatchers can view
    (
      EXISTS (
        SELECT 1
        FROM user_organization_roles uo
        JOIN users u ON uo.user_id = u.id
        WHERE u.auth_user_id = (SELECT auth.uid())
          AND uo.organization_id = assignments.organization_id
          AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
      )
    )
    OR
    -- Drivers can view their assignments
    (
      EXISTS (
        SELECT 1
        FROM user_organization_roles uo
        JOIN users u ON uo.user_id = u.id
        WHERE u.auth_user_id = (SELECT auth.uid())
          AND uo.organization_id = assignments.organization_id
          AND uo.role = 'driver'::app_role
          AND u.id = assignments.driver_id
      )
    )
  );

-- assignments: Consolidate UPDATE policies
DROP POLICY IF EXISTS "Users can update assignments" ON public.assignments;
CREATE POLICY "assignments_update_policy" ON public.assignments
  FOR UPDATE
  USING (
    -- Admins, ops, dispatchers can update
    (
      EXISTS (
        SELECT 1
        FROM user_organization_roles uo
        JOIN users u ON uo.user_id = u.id
        WHERE u.auth_user_id = (SELECT auth.uid())
          AND uo.organization_id = assignments.organization_id
          AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
      )
    )
    OR
    -- Drivers can update their own assignments
    (
      EXISTS (
        SELECT 1
        FROM user_organization_roles uo
        JOIN users u ON uo.user_id = u.id
        WHERE u.auth_user_id = (SELECT auth.uid())
          AND uo.organization_id = assignments.organization_id
          AND uo.role = 'driver'::app_role
          AND u.id = assignments.driver_id
      )
    )
  );

-- assignments: Consolidate INSERT policies
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.assignments;
CREATE POLICY "assignments_insert_policy" ON public.assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = assignments.organization_id
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
    )
  );

-- assignments: Consolidate DELETE policies
DROP POLICY IF EXISTS "Admins can delete assignments" ON public.assignments;
CREATE POLICY "assignments_delete_policy" ON public.assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = assignments.organization_id
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
    )
  );

-- manifests: Consolidate SELECT policies  
DROP POLICY IF EXISTS "Enhanced manifest select" ON public.manifests;
DROP POLICY IF EXISTS "Org members can read manifests" ON public.manifests;
CREATE POLICY "manifests_select_policy" ON public.manifests
  FOR SELECT
  USING (
    -- Org members can view
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = manifests.organization_id
    )
    OR
    -- Drivers can view their assigned manifests
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = 'driver'::app_role
        AND u.id IN (
          SELECT driver_id FROM assignments a
          JOIN pickups p ON a.pickup_id = p.id
          WHERE p.id = manifests.pickup_id
        )
    )
  );

-- clients: Consolidate SELECT policies
DROP POLICY IF EXISTS "Org members can read clients" ON public.clients;
CREATE POLICY "clients_select_policy" ON public.clients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = clients.organization_id
    )
  );

-- clients: Consolidate INSERT policies
DROP POLICY IF EXISTS "Admins, ops, sales can insert clients" ON public.clients;
CREATE POLICY "clients_insert_policy" ON public.clients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = clients.organization_id
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'sales'::app_role])
    )
  );

-- clients: Consolidate UPDATE policies
DROP POLICY IF EXISTS "Admins, ops, sales can update clients" ON public.clients;
CREATE POLICY "clients_update_policy" ON public.clients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = clients.organization_id
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'sales'::app_role])
    )
  );

-- clients: Consolidate DELETE policies
DROP POLICY IF EXISTS "Admins, ops, sales can delete clients" ON public.clients;
CREATE POLICY "clients_delete_policy" ON public.clients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = clients.organization_id
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'sales'::app_role])
    )
  );