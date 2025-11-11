-- Fix remaining auth_rls_initplan warnings by wrapping current_setting() in subqueries
-- Also consolidate multiple permissive policies into single optimized policies

-- ai_insights: Consolidate policies
DROP POLICY IF EXISTS "ai_insights_select_policy" ON public.ai_insights;
DROP POLICY IF EXISTS "ai_insights_service_role_policy" ON public.ai_insights;

CREATE POLICY "ai_insights_unified_select" ON public.ai_insights
FOR SELECT USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (
    ((SELECT auth.uid()) IS NOT NULL) AND 
    (organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role])
    ))
  )
);

CREATE POLICY "ai_insights_service_manage" ON public.ai_insights
FOR ALL USING ((SELECT current_setting('role'::text)) = 'service_role')
WITH CHECK ((SELECT current_setting('role'::text)) = 'service_role');

-- ai_query_logs: Consolidate policies
DROP POLICY IF EXISTS "ai_query_logs_select_policy" ON public.ai_query_logs;
DROP POLICY IF EXISTS "ai_query_logs_service_role_policy" ON public.ai_query_logs;

CREATE POLICY "ai_query_logs_unified_select" ON public.ai_query_logs
FOR SELECT USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'sales'::app_role])
    )
  )
);

CREATE POLICY "ai_query_logs_service_manage" ON public.ai_query_logs
FOR ALL USING ((SELECT current_setting('role'::text)) = 'service_role')
WITH CHECK ((SELECT current_setting('role'::text)) = 'service_role');

-- capacity_preview: Consolidate policies
DROP POLICY IF EXISTS "capacity_preview_select_policy" ON public.capacity_preview;
DROP POLICY IF EXISTS "capacity_preview_service_role_policy" ON public.capacity_preview;

CREATE POLICY "capacity_preview_unified_select" ON public.capacity_preview
FOR SELECT USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (
    ((SELECT auth.uid()) IS NOT NULL) AND 
    (organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role])
    ))
  )
);

CREATE POLICY "capacity_preview_service_manage" ON public.capacity_preview
FOR ALL USING ((SELECT current_setting('role'::text)) = 'service_role')
WITH CHECK ((SELECT current_setting('role'::text)) = 'service_role');

-- client_engagement: Consolidate policies
DROP POLICY IF EXISTS "client_engagement_select_policy" ON public.client_engagement;
DROP POLICY IF EXISTS "client_engagement_service_role_policy" ON public.client_engagement;

CREATE POLICY "client_engagement_unified_select" ON public.client_engagement
FOR SELECT USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "client_engagement_service_manage" ON public.client_engagement
FOR ALL USING ((SELECT current_setting('role'::text)) = 'service_role')
WITH CHECK ((SELECT current_setting('role'::text)) = 'service_role');

-- client_health_scores: Consolidate policies
DROP POLICY IF EXISTS "client_health_scores_select_policy" ON public.client_health_scores;
DROP POLICY IF EXISTS "client_health_scores_service_role_policy" ON public.client_health_scores;

CREATE POLICY "client_health_scores_unified_select" ON public.client_health_scores
FOR SELECT USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (
    ((SELECT auth.uid()) IS NOT NULL) AND 
    (organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    ))
  )
);

CREATE POLICY "client_health_scores_service_manage" ON public.client_health_scores
FOR ALL USING ((SELECT current_setting('role'::text)) = 'service_role')
WITH CHECK ((SELECT current_setting('role'::text)) = 'service_role');

-- client_pickup_patterns: Consolidate policies
DROP POLICY IF EXISTS "client_pickup_patterns_select_policy" ON public.client_pickup_patterns;
DROP POLICY IF EXISTS "client_pickup_patterns_service_role_policy" ON public.client_pickup_patterns;

CREATE POLICY "client_pickup_patterns_unified_select" ON public.client_pickup_patterns
FOR SELECT USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "client_pickup_patterns_service_manage" ON public.client_pickup_patterns
FOR ALL USING ((SELECT current_setting('role'::text)) = 'service_role')
WITH CHECK ((SELECT current_setting('role'::text)) = 'service_role');

-- client_risk_scores: Consolidate policies
DROP POLICY IF EXISTS "client_risk_scores_select_policy" ON public.client_risk_scores;
DROP POLICY IF EXISTS "client_risk_scores_service_role_policy" ON public.client_risk_scores;

CREATE POLICY "client_risk_scores_unified_select" ON public.client_risk_scores
FOR SELECT USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (
    ((SELECT auth.uid()) IS NOT NULL) AND 
    (organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY (ARRAY['admin'::app_role, 'sales'::app_role, 'ops_manager'::app_role])
    ))
  )
);

CREATE POLICY "client_risk_scores_service_manage" ON public.client_risk_scores
FOR ALL USING ((SELECT current_setting('role'::text)) = 'service_role')
WITH CHECK ((SELECT current_setting('role'::text)) = 'service_role');

-- data_quality_flags: Fix current_setting call
DROP POLICY IF EXISTS "data_quality_flags_policy" ON public.data_quality_flags;

CREATE POLICY "data_quality_flags_unified" ON public.data_quality_flags
FOR ALL USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = data_quality_flags.organization_id
        AND uo.role = 'admin'::app_role
    )
  )
);

-- driver_performance: Consolidate policies
DROP POLICY IF EXISTS "driver_performance_select_policy" ON public.driver_performance;
DROP POLICY IF EXISTS "driver_performance_service_role_policy" ON public.driver_performance;

CREATE POLICY "driver_performance_unified_select" ON public.driver_performance
FOR SELECT USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (
    ((SELECT auth.uid()) IS NOT NULL) AND 
    (organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role])
    ))
  )
);

CREATE POLICY "driver_performance_service_manage" ON public.driver_performance
FOR ALL USING ((SELECT current_setting('role'::text)) = 'service_role')
WITH CHECK ((SELECT current_setting('role'::text)) = 'service_role');

-- hauler_reliability: Consolidate policies
DROP POLICY IF EXISTS "hauler_reliability_select_policy" ON public.hauler_reliability;
DROP POLICY IF EXISTS "hauler_reliability_service_role_policy" ON public.hauler_reliability;

CREATE POLICY "hauler_reliability_unified_select" ON public.hauler_reliability
FOR SELECT USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (
    ((SELECT auth.uid()) IS NOT NULL) AND 
    (organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    ))
  )
);

CREATE POLICY "hauler_reliability_service_manage" ON public.hauler_reliability
FOR ALL USING ((SELECT current_setting('role'::text)) = 'service_role')
WITH CHECK ((SELECT current_setting('role'::text)) = 'service_role');

-- assignments: Fix select policy
DROP POLICY IF EXISTS "assignments_select_policy" ON public.assignments;

CREATE POLICY "assignments_unified_select" ON public.assignments
FOR SELECT USING (
  ((SELECT current_setting('role'::text)) = 'service_role') OR
  (
    EXISTS (
      SELECT 1
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND uo.organization_id = assignments.organization_id
        AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
    )
  ) OR
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