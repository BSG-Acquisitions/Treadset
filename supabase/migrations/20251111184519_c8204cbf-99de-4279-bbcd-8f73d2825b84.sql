-- Fix remaining multiple permissive policies and duplicate indexes

-- ============================================
-- CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- ============================================

-- operational_metrics
DROP POLICY IF EXISTS "Service role manages metrics" ON public.operational_metrics;
-- Keep "Org members view metrics" policy

-- performance_alerts  
DROP POLICY IF EXISTS "Service role can manage performance alerts" ON public.performance_alerts;
-- Keep "Admins can view performance alerts" policy

-- performance_metrics
DROP POLICY IF EXISTS "Service role can manage performance metrics" ON public.performance_metrics;
-- Keep "Org members can view performance metrics" policy

-- pickup_patterns
DROP POLICY IF EXISTS "Service role manages pickup patterns" ON public.pickup_patterns;
-- Keep "Org members view pickup patterns" policy

-- revenue_forecasts
DROP POLICY IF EXISTS "Service role manages revenue forecasts" ON public.revenue_forecasts;
-- Keep "Org members view revenue forecasts" policy

-- stripe_payments: consolidate into single policy per action
DROP POLICY IF EXISTS "Service role can access payments" ON public.stripe_payments;
-- Keep "Org members can access payments" policy

-- ============================================
-- DROP DUPLICATE INDEXES
-- ============================================

-- ai_query_logs
DROP INDEX IF EXISTS public.idx_ai_query_logs_org;
DROP INDEX IF EXISTS idx_ai_query_logs_user;
-- Keep idx_ai_query_logs_organization_id and idx_ai_query_logs_user_id

-- client_engagement
DROP INDEX IF EXISTS idx_client_engagement_client;
-- Keep idx_client_engagement_client_id

-- client_health_scores
DROP INDEX IF EXISTS idx_client_health_scores_org_id;
-- Keep idx_client_health_scores_organization_id

-- client_pricing_overrides
DROP INDEX IF EXISTS idx_client_pricing_overrides_client;
DROP INDEX IF EXISTS idx_client_pricing_overrides_org;
-- Keep idx_client_pricing_overrides_client_id and idx_client_pricing_overrides_organization_id

-- client_risk_scores
DROP INDEX IF EXISTS idx_client_risk_scores_client;
DROP INDEX IF EXISTS idx_client_risk_scores_org;
-- Keep idx_client_risk_scores_client_id and idx_client_risk_scores_organization_id

-- data_quality_flags
DROP INDEX IF EXISTS idx_data_quality_flags_org;
-- Keep idx_data_quality_flags_organization_id

-- hauler_reliability
DROP INDEX IF EXISTS idx_hauler_reliability_hauler;
DROP INDEX IF EXISTS idx_hauler_reliability_org;
-- Keep idx_hauler_reliability_hauler_id and idx_hauler_reliability_organization_id

-- location_pricing_overrides
DROP INDEX IF EXISTS idx_location_pricing_overrides_location;
-- Keep idx_location_pricing_overrides_location_id