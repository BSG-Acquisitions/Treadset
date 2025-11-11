-- Fix multiple permissive policies by removing separate service_manage policies
-- and consolidating into single unified policies

-- ai_insights
DROP POLICY IF EXISTS "ai_insights_service_manage" ON public.ai_insights;
-- The unified_select policy already handles service_role

-- ai_query_logs
DROP POLICY IF EXISTS "ai_query_logs_service_manage" ON public.ai_query_logs;

-- capacity_preview
DROP POLICY IF EXISTS "capacity_preview_service_manage" ON public.capacity_preview;

-- client_engagement
DROP POLICY IF EXISTS "client_engagement_service_manage" ON public.client_engagement;

-- client_health_scores
DROP POLICY IF EXISTS "client_health_scores_service_manage" ON public.client_health_scores;

-- client_pickup_patterns
DROP POLICY IF EXISTS "client_pickup_patterns_service_manage" ON public.client_pickup_patterns;

-- client_risk_scores
DROP POLICY IF EXISTS "client_risk_scores_service_manage" ON public.client_risk_scores;

-- driver_performance
DROP POLICY IF EXISTS "driver_performance_service_manage" ON public.driver_performance;

-- hauler_reliability
DROP POLICY IF EXISTS "hauler_reliability_service_manage" ON public.hauler_reliability;

-- conversions: consolidate existing policies
DROP POLICY IF EXISTS "Allow read access to conversions" ON public.conversions;
DROP POLICY IF EXISTS "Only admins can modify conversions" ON public.conversions;

CREATE POLICY "conversions_select" ON public.conversions
FOR SELECT USING (true);

CREATE POLICY "conversions_manage" ON public.conversions
FOR ALL USING (
  user_has_role('admin'::app_role)
)
WITH CHECK (
  user_has_role('admin'::app_role)
);

-- facility_hauler_rates: consolidate
DROP POLICY IF EXISTS "facility_hauler_rates_select_policy" ON public.facility_hauler_rates;
DROP POLICY IF EXISTS "facility_hauler_rates_manage_policy" ON public.facility_hauler_rates;

CREATE POLICY "facility_hauler_rates_unified_select" ON public.facility_hauler_rates
FOR SELECT USING (
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "facility_hauler_rates_unified_manage" ON public.facility_hauler_rates
FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = facility_hauler_rates.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = facility_hauler_rates.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role])
  )
);

-- hauler_customers: consolidate
DROP POLICY IF EXISTS "hauler_customers_select_policy" ON public.hauler_customers;
DROP POLICY IF EXISTS "hauler_customers_manage_policy" ON public.hauler_customers;

CREATE POLICY "hauler_customers_unified_select" ON public.hauler_customers
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

CREATE POLICY "hauler_customers_unified_manage" ON public.hauler_customers
FOR ALL USING (
  hauler_id IN (
    SELECT haulers.id
    FROM haulers
    WHERE haulers.user_id IN (
      SELECT users.id
      FROM users
      WHERE users.auth_user_id = (SELECT auth.uid())
    )
  )
)
WITH CHECK (
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