-- Fix multiple permissive policies by consolidating them into single policies
-- This improves performance by reducing the number of policy evaluations

-- ai_insights: Consolidate SELECT policies
DROP POLICY IF EXISTS "Admin and Ops can view AI insights" ON public.ai_insights;
DROP POLICY IF EXISTS "Service role can manage AI insights" ON public.ai_insights;
CREATE POLICY "ai_insights_select_policy" ON public.ai_insights
  FOR SELECT
  USING (
    -- Service role bypass
    true IS NULL
    OR
    -- Admin and Ops access
    (
      (SELECT auth.uid()) IS NOT NULL
      AND organization_id IN (
        SELECT uo.organization_id
        FROM user_organization_roles uo
        JOIN users u ON uo.user_id = u.id
        WHERE u.auth_user_id = (SELECT auth.uid())
          AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role])
      )
    )
  );

-- Keep service role policy separate for INSERT/UPDATE/DELETE
CREATE POLICY "ai_insights_service_role_policy" ON public.ai_insights
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- ai_query_logs: Consolidate SELECT policies
DROP POLICY IF EXISTS "Admins can view AI query logs" ON public.ai_query_logs;
DROP POLICY IF EXISTS "Service role can manage AI query logs" ON public.ai_query_logs;
CREATE POLICY "ai_query_logs_select_policy" ON public.ai_query_logs
  FOR SELECT
  USING (
    current_setting('role') = 'service_role'
    OR
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'sales'::app_role])
    )
  );

CREATE POLICY "ai_query_logs_service_role_policy" ON public.ai_query_logs
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- capacity_preview: Consolidate SELECT policies
DROP POLICY IF EXISTS "Admin and Ops can view capacity predictions" ON public.capacity_preview;
DROP POLICY IF EXISTS "Service role can manage capacity predictions" ON public.capacity_preview;
CREATE POLICY "capacity_preview_select_policy" ON public.capacity_preview
  FOR SELECT
  USING (
    current_setting('role') = 'service_role'
    OR
    (
      (SELECT auth.uid()) IS NOT NULL
      AND organization_id IN (
        SELECT uo.organization_id
        FROM user_organization_roles uo
        JOIN users u ON uo.user_id = u.id
        WHERE u.auth_user_id = (SELECT auth.uid())
          AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role])
      )
    )
  );

CREATE POLICY "capacity_preview_service_role_policy" ON public.capacity_preview
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- client_engagement: Consolidate SELECT policies
DROP POLICY IF EXISTS "Org members view engagement" ON public.client_engagement;
DROP POLICY IF EXISTS "Service role manages engagement" ON public.client_engagement;
CREATE POLICY "client_engagement_select_policy" ON public.client_engagement
  FOR SELECT
  USING (
    current_setting('role') = 'service_role'
    OR
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "client_engagement_service_role_policy" ON public.client_engagement
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- client_health_scores: Consolidate SELECT policies
DROP POLICY IF EXISTS "Org members can view client health scores" ON public.client_health_scores;
DROP POLICY IF EXISTS "Service role can manage client health scores" ON public.client_health_scores;
CREATE POLICY "client_health_scores_select_policy" ON public.client_health_scores
  FOR SELECT
  USING (
    current_setting('role') = 'service_role'
    OR
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

CREATE POLICY "client_health_scores_service_role_policy" ON public.client_health_scores
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- client_pickup_patterns: Consolidate SELECT policies
DROP POLICY IF EXISTS "Org members can view pickup patterns" ON public.client_pickup_patterns;
DROP POLICY IF EXISTS "Service role can manage pickup patterns" ON public.client_pickup_patterns;
CREATE POLICY "client_pickup_patterns_select_policy" ON public.client_pickup_patterns
  FOR SELECT
  USING (
    current_setting('role') = 'service_role'
    OR
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "client_pickup_patterns_service_role_policy" ON public.client_pickup_patterns
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- client_risk_scores: Consolidate SELECT policies
DROP POLICY IF EXISTS "Admin, Sales, Ops can view risk scores" ON public.client_risk_scores;
DROP POLICY IF EXISTS "Service role can manage risk scores" ON public.client_risk_scores;
CREATE POLICY "client_risk_scores_select_policy" ON public.client_risk_scores
  FOR SELECT
  USING (
    current_setting('role') = 'service_role'
    OR
    (
      (SELECT auth.uid()) IS NOT NULL
      AND organization_id IN (
        SELECT uo.organization_id
        FROM user_organization_roles uo
        JOIN users u ON uo.user_id = u.id
        WHERE u.auth_user_id = (SELECT auth.uid())
          AND uo.role = ANY(ARRAY['admin'::app_role, 'sales'::app_role, 'ops_manager'::app_role])
      )
    )
  );

CREATE POLICY "client_risk_scores_service_role_policy" ON public.client_risk_scores
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- data_quality_flags: Consolidate policies
DROP POLICY IF EXISTS "Admins can manage data quality flags" ON public.data_quality_flags;
DROP POLICY IF EXISTS "Service role can access data quality flags" ON public.data_quality_flags;
CREATE POLICY "data_quality_flags_policy" ON public.data_quality_flags
  FOR ALL
  USING (
    current_setting('role') = 'service_role'
    OR
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = data_quality_flags.organization_id
        AND uo.role = 'admin'::app_role
    )
  );

-- driver_performance: Consolidate SELECT policies
DROP POLICY IF EXISTS "Admins and Ops can view driver performance" ON public.driver_performance;
DROP POLICY IF EXISTS "Service role can manage driver performance" ON public.driver_performance;
CREATE POLICY "driver_performance_select_policy" ON public.driver_performance
  FOR SELECT
  USING (
    current_setting('role') = 'service_role'
    OR
    (
      (SELECT auth.uid()) IS NOT NULL
      AND organization_id IN (
        SELECT uo.organization_id
        FROM user_organization_roles uo
        JOIN users u ON uo.user_id = u.id
        WHERE u.auth_user_id = (SELECT auth.uid())
          AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role])
      )
    )
  );

CREATE POLICY "driver_performance_service_role_policy" ON public.driver_performance
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- hauler_reliability: Consolidate SELECT policies
DROP POLICY IF EXISTS "Org members can view hauler reliability" ON public.hauler_reliability;
DROP POLICY IF EXISTS "Service role can manage hauler reliability" ON public.hauler_reliability;
CREATE POLICY "hauler_reliability_select_policy" ON public.hauler_reliability
  FOR SELECT
  USING (
    current_setting('role') = 'service_role'
    OR
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

CREATE POLICY "hauler_reliability_service_role_policy" ON public.hauler_reliability
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- manifest_alerts: Consolidate SELECT policies
DROP POLICY IF EXISTS "Org members can view manifest alerts" ON public.manifest_alerts;
DROP POLICY IF EXISTS "Admins can manage manifest alerts" ON public.manifest_alerts;
CREATE POLICY "manifest_alerts_select_policy" ON public.manifest_alerts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "manifest_alerts_admin_policy" ON public.manifest_alerts
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