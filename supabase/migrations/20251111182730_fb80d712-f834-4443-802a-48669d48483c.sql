-- Fix all auth_rls_initplan performance warnings by wrapping auth.uid() with SELECT
-- This prevents unnecessary re-evaluation of auth functions for each row

-- pickups table policies
DROP POLICY IF EXISTS "Enhanced pickup insert" ON public.pickups;
CREATE POLICY "Enhanced pickup insert" ON public.pickups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = pickups.organization_id
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
    )
  );

DROP POLICY IF EXISTS "Drivers can access assigned pickups" ON public.pickups;
CREATE POLICY "Drivers can access assigned pickups" ON public.pickups
  FOR SELECT
  USING (
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

DROP POLICY IF EXISTS "Drivers can update assigned pickups" ON public.pickups;
CREATE POLICY "Drivers can update assigned pickups" ON public.pickups
  FOR UPDATE
  USING (
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

-- hauler_reliability table
DROP POLICY IF EXISTS "Org members can view hauler reliability" ON public.hauler_reliability;
CREATE POLICY "Org members can view hauler reliability" ON public.hauler_reliability
  FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

-- manifests table policies
DROP POLICY IF EXISTS "Enhanced manifest select" ON public.manifests;
CREATE POLICY "Enhanced manifest select" ON public.manifests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = manifests.organization_id
    )
    OR
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

DROP POLICY IF EXISTS "Enhanced manifest insert" ON public.manifests;
CREATE POLICY "Enhanced manifest insert" ON public.manifests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = manifests.organization_id
    )
  );

DROP POLICY IF EXISTS "Enhanced manifest update" ON public.manifests;
CREATE POLICY "Enhanced manifest update" ON public.manifests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = manifests.organization_id
    )
  );

-- data_quality_flags table
DROP POLICY IF EXISTS "Admins can manage data quality flags" ON public.data_quality_flags;
CREATE POLICY "Admins can manage data quality flags" ON public.data_quality_flags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = data_quality_flags.organization_id
        AND uo.role = 'admin'::app_role
    )
  );

-- ai_query_logs table
DROP POLICY IF EXISTS "Admins can view AI query logs" ON public.ai_query_logs;
CREATE POLICY "Admins can view AI query logs" ON public.ai_query_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'sales'::app_role])
    )
  );

-- ai_insights table
DROP POLICY IF EXISTS "Admin and Ops can view AI insights" ON public.ai_insights;
CREATE POLICY "Admin and Ops can view AI insights" ON public.ai_insights
  FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role])
    )
  );

-- entities table
DROP POLICY IF EXISTS "Org members can access entities" ON public.entities;
CREATE POLICY "Org members can access entities" ON public.entities
  FOR ALL
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

-- reporting_locations table
DROP POLICY IF EXISTS "Org members can access reporting locations" ON public.reporting_locations;
CREATE POLICY "Org members can access reporting locations" ON public.reporting_locations
  FOR ALL
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

-- processing_events table
DROP POLICY IF EXISTS "Org members can access processing events" ON public.processing_events;
CREATE POLICY "Org members can access processing events" ON public.processing_events
  FOR ALL
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

-- client_health_scores table
DROP POLICY IF EXISTS "Org members can view client health scores" ON public.client_health_scores;
CREATE POLICY "Org members can view client health scores" ON public.client_health_scores
  FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

-- shipments table
DROP POLICY IF EXISTS "Org members can access shipments" ON public.shipments;
CREATE POLICY "Org members can access shipments" ON public.shipments
  FOR ALL
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

-- reports_annual table
DROP POLICY IF EXISTS "Org members can access annual reports" ON public.reports_annual;
CREATE POLICY "Org members can access annual reports" ON public.reports_annual
  FOR ALL
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

-- report_monthly_snapshots table
DROP POLICY IF EXISTS "Org members can access monthly snapshots" ON public.report_monthly_snapshots;
CREATE POLICY "Org members can access monthly snapshots" ON public.report_monthly_snapshots
  FOR ALL
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

-- manifest_alerts table
DROP POLICY IF EXISTS "Org members can view manifest alerts" ON public.manifest_alerts;
CREATE POLICY "Org members can view manifest alerts" ON public.manifest_alerts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage manifest alerts" ON public.manifest_alerts;
CREATE POLICY "Admins can manage manifest alerts" ON public.manifest_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = manifest_alerts.organization_id
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role])
    )
  );

-- driver_performance table
DROP POLICY IF EXISTS "Admins and Ops can view driver performance" ON public.driver_performance;
CREATE POLICY "Admins and Ops can view driver performance" ON public.driver_performance
  FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role])
    )
  );

-- stripe_payments table
DROP POLICY IF EXISTS "Org members can access payments" ON public.stripe_payments;
CREATE POLICY "Org members can access payments" ON public.stripe_payments
  FOR ALL
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

-- pickup_patterns table
DROP POLICY IF EXISTS "Org members view pickup patterns" ON public.pickup_patterns;
CREATE POLICY "Org members view pickup patterns" ON public.pickup_patterns
  FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

-- revenue_forecasts table
DROP POLICY IF EXISTS "Org members view revenue forecasts" ON public.revenue_forecasts;
CREATE POLICY "Org members view revenue forecasts" ON public.revenue_forecasts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

-- capacity_preview table
DROP POLICY IF EXISTS "Admin and Ops can view capacity predictions" ON public.capacity_preview;
CREATE POLICY "Admin and Ops can view capacity predictions" ON public.capacity_preview
  FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role])
    )
  );

-- client_engagement table
DROP POLICY IF EXISTS "Org members view engagement" ON public.client_engagement;
CREATE POLICY "Org members view engagement" ON public.client_engagement
  FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

-- operational_metrics table
DROP POLICY IF EXISTS "Org members view metrics" ON public.operational_metrics;
CREATE POLICY "Org members view metrics" ON public.operational_metrics
  FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

-- performance_metrics table
DROP POLICY IF EXISTS "Org members can view performance metrics" ON public.performance_metrics;
CREATE POLICY "Org members can view performance metrics" ON public.performance_metrics
  FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

-- performance_alerts table
DROP POLICY IF EXISTS "Admins can view performance alerts" ON public.performance_alerts;
CREATE POLICY "Admins can view performance alerts" ON public.performance_alerts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role])
    )
  );

-- client_pickup_patterns table
DROP POLICY IF EXISTS "Org members can view pickup patterns" ON public.client_pickup_patterns;
CREATE POLICY "Org members can view pickup patterns" ON public.client_pickup_patterns
  FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

-- hauler_customers table
DROP POLICY IF EXISTS "Haulers view own customers" ON public.hauler_customers;
CREATE POLICY "Haulers view own customers" ON public.hauler_customers
  FOR SELECT
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

DROP POLICY IF EXISTS "Haulers manage own customers" ON public.hauler_customers;
CREATE POLICY "Haulers manage own customers" ON public.hauler_customers
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

DROP POLICY IF EXISTS "Admins view all hauler customers" ON public.hauler_customers;
CREATE POLICY "Admins view all hauler customers" ON public.hauler_customers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role])
    )
  );

-- facility_hauler_rates table
DROP POLICY IF EXISTS "Org view rates" ON public.facility_hauler_rates;
CREATE POLICY "Org view rates" ON public.facility_hauler_rates
  FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins manage rates" ON public.facility_hauler_rates;
CREATE POLICY "Admins manage rates" ON public.facility_hauler_rates
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

-- haulers table
DROP POLICY IF EXISTS "Haulers view own profile" ON public.haulers;
CREATE POLICY "Haulers view own profile" ON public.haulers
  FOR SELECT
  USING (
    user_id IN (
      SELECT users.id
      FROM users
      WHERE users.auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Org view haulers" ON public.haulers;
CREATE POLICY "Org view haulers" ON public.haulers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
    )
  );

DROP POLICY IF EXISTS "Admins manage haulers" ON public.haulers;
CREATE POLICY "Admins manage haulers" ON public.haulers
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

-- dropoffs table
DROP POLICY IF EXISTS "Haulers manage dropoffs" ON public.dropoffs;
CREATE POLICY "Haulers manage dropoffs" ON public.dropoffs
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

-- client_risk_scores table
DROP POLICY IF EXISTS "Admin, Sales, Ops can view risk scores" ON public.client_risk_scores;
CREATE POLICY "Admin, Sales, Ops can view risk scores" ON public.client_risk_scores
  FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY(ARRAY['admin'::app_role, 'sales'::app_role, 'ops_manager'::app_role])
    )
  );

-- system_updates table
DROP POLICY IF EXISTS "Admins can manage system updates" ON public.system_updates;
CREATE POLICY "Admins can manage system updates" ON public.system_updates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = 'admin'::app_role
    )
  );

-- manifest_tasks table
DROP POLICY IF EXISTS "Org members can view tasks" ON public.manifest_tasks;
CREATE POLICY "Org members can view tasks" ON public.manifest_tasks
  FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins and assigned users can update tasks" ON public.manifest_tasks;
CREATE POLICY "Admins and assigned users can update tasks" ON public.manifest_tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = manifest_tasks.organization_id
        AND (uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role]) OR u.id = manifest_tasks.assigned_to)
    )
  );

-- manifest_followups table
DROP POLICY IF EXISTS "Org members can view followups" ON public.manifest_followups;
CREATE POLICY "Org members can view followups" ON public.manifest_followups
  FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );