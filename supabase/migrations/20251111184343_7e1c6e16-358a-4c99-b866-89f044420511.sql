-- Final consolidation of multiple permissive policies
-- Remove "manage" policies and merge logic into specific action policies

-- conversions: Remove manage policy, keep only select
DROP POLICY IF EXISTS "conversions_manage" ON public.conversions;
-- conversions_select already allows all users to read

-- facility_hauler_rates: Merge into single policies
DROP POLICY IF EXISTS "facility_hauler_rates_unified_manage" ON public.facility_hauler_rates;
DROP POLICY IF EXISTS "facility_hauler_rates_unified_select" ON public.facility_hauler_rates;

CREATE POLICY "facility_hauler_rates_select" ON public.facility_hauler_rates
FOR SELECT USING (
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "facility_hauler_rates_insert" ON public.facility_hauler_rates
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = facility_hauler_rates.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role])
  )
);

CREATE POLICY "facility_hauler_rates_update" ON public.facility_hauler_rates
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = facility_hauler_rates.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role])
  )
);

CREATE POLICY "facility_hauler_rates_delete" ON public.facility_hauler_rates
FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = facility_hauler_rates.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role])
  )
);

-- hauler_customers: Merge into single policies
DROP POLICY IF EXISTS "hauler_customers_unified_manage" ON public.hauler_customers;
DROP POLICY IF EXISTS "hauler_customers_unified_select" ON public.hauler_customers;

CREATE POLICY "hauler_customers_select" ON public.hauler_customers
FOR SELECT USING (
  (hauler_id IN (
    SELECT haulers.id
    FROM haulers
    WHERE haulers.user_id IN (
      SELECT users.id
      FROM users
      WHERE users.auth_user_id = (SELECT auth.uid())
    )
  )) OR
  (EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role])
  ))
);

CREATE POLICY "hauler_customers_insert" ON public.hauler_customers
FOR INSERT WITH CHECK (
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

CREATE POLICY "hauler_customers_update" ON public.hauler_customers
FOR UPDATE USING (
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

CREATE POLICY "hauler_customers_delete" ON public.hauler_customers
FOR DELETE USING (
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

-- haulers: Consolidate
DROP POLICY IF EXISTS "haulers_manage_policy" ON public.haulers;
DROP POLICY IF EXISTS "haulers_select_policy" ON public.haulers;

CREATE POLICY "haulers_select" ON public.haulers
FOR SELECT USING (
  (user_id IN (
    SELECT users.id
    FROM users
    WHERE users.auth_user_id = (SELECT auth.uid())
  )) OR
  (EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
  ))
);

CREATE POLICY "haulers_insert" ON public.haulers
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role])
  )
);

CREATE POLICY "haulers_update" ON public.haulers
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role])
  )
);

CREATE POLICY "haulers_delete" ON public.haulers
FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role])
  )
);

-- manifest_alerts: Consolidate
DROP POLICY IF EXISTS "manifest_alerts_admin_policy" ON public.manifest_alerts;
DROP POLICY IF EXISTS "manifest_alerts_select_policy" ON public.manifest_alerts;

CREATE POLICY "manifest_alerts_select" ON public.manifest_alerts
FOR SELECT USING (
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "manifest_alerts_manage" ON public.manifest_alerts
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = manifest_alerts.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role])
  )
);

CREATE POLICY "manifest_alerts_update" ON public.manifest_alerts
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = manifest_alerts.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role])
  )
);

CREATE POLICY "manifest_alerts_delete" ON public.manifest_alerts
FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = manifest_alerts.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role])
  )
);

-- manifest_followups: Consolidate
DROP POLICY IF EXISTS "Org members can view followups" ON public.manifest_followups;
DROP POLICY IF EXISTS "Service role can manage followups" ON public.manifest_followups;

CREATE POLICY "manifest_followups_select" ON public.manifest_followups
FOR SELECT USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
  ))
);

-- manifest_tasks: Consolidate
DROP POLICY IF EXISTS "Org members can view tasks" ON public.manifest_tasks;
DROP POLICY IF EXISTS "Admins and assigned users can update tasks" ON public.manifest_tasks;
DROP POLICY IF EXISTS "Service role can manage tasks" ON public.manifest_tasks;

CREATE POLICY "manifest_tasks_select" ON public.manifest_tasks
FOR SELECT USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
  ))
);

CREATE POLICY "manifest_tasks_update" ON public.manifest_tasks
FOR UPDATE USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = manifest_tasks.organization_id
      AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role]) OR u.id = manifest_tasks.assigned_to)
  ))
);