-- Fix Database Security Warnings
-- Run this in Supabase SQL Editor to resolve function search_path warnings

-- 1. refresh_reporting_views
CREATE OR REPLACE FUNCTION public.refresh_reporting_views()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_entity_rollup;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_processing_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_revenue_summary;
END;
$function$;

-- 2. trigger_refresh_reporting_views
CREATE OR REPLACE FUNCTION public.trigger_refresh_reporting_views()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM pg_notify('refresh_reporting_views', '');
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 3. log_slow_query
CREATE OR REPLACE FUNCTION public.log_slow_query(p_query_name text, p_execution_time_ms integer, p_rows_returned integer DEFAULT NULL::integer, p_query_params jsonb DEFAULT NULL::jsonb, p_optimization text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  log_id UUID;
BEGIN
  IF p_execution_time_ms > 250 THEN
    INSERT INTO public.performance_logs (
      query_name,
      execution_time_ms,
      rows_returned,
      query_params,
      optimization_applied
    ) VALUES (
      p_query_name,
      p_execution_time_ms,
      p_rows_returned,
      p_query_params,
      p_optimization
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- 4. check_performance_thresholds
CREATE OR REPLACE FUNCTION public.check_performance_thresholds()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_record RECORD;
  avg_query_time NUMERIC;
  cache_hit_ratio NUMERIC;
  alert_message TEXT;
BEGIN
  FOR org_record IN SELECT DISTINCT organization_id FROM public.performance_metrics LOOP
    
    SELECT AVG(metric_value) INTO avg_query_time
    FROM public.performance_metrics
    WHERE organization_id = org_record.organization_id
      AND metric_name = 'query_execution_time'
      AND captured_at >= now() - INTERVAL '1 hour';
    
    IF avg_query_time > 500 THEN
      INSERT INTO public.performance_alerts (
        organization_id,
        alert_type,
        severity,
        message,
        metric_name,
        metric_value,
        threshold
      ) VALUES (
        org_record.organization_id,
        'slow_query',
        CASE WHEN avg_query_time > 1000 THEN 'critical' ELSE 'warning' END,
        'Average query time exceeded threshold: ' || ROUND(avg_query_time, 2) || 'ms (threshold: 500ms)',
        'query_execution_time',
        avg_query_time,
        500
      );
    END IF;
    
    SELECT 
      CASE 
        WHEN SUM(CASE WHEN metric_name = 'cache_hit' THEN metric_value ELSE 0 END) + 
             SUM(CASE WHEN metric_name = 'cache_miss' THEN metric_value ELSE 0 END) > 0
        THEN (SUM(CASE WHEN metric_name = 'cache_hit' THEN metric_value ELSE 0 END) / 
              (SUM(CASE WHEN metric_name = 'cache_hit' THEN metric_value ELSE 0 END) + 
               SUM(CASE WHEN metric_name = 'cache_miss' THEN metric_value ELSE 0 END))) * 100
        ELSE 100
      END INTO cache_hit_ratio
    FROM public.performance_metrics
    WHERE organization_id = org_record.organization_id
      AND metric_name IN ('cache_hit', 'cache_miss')
      AND captured_at >= now() - INTERVAL '1 hour';
    
    IF cache_hit_ratio < 80 THEN
      INSERT INTO public.performance_alerts (
        organization_id,
        alert_type,
        severity,
        message,
        metric_name,
        metric_value,
        threshold
      ) VALUES (
        org_record.organization_id,
        'low_cache_hit_ratio',
        CASE WHEN cache_hit_ratio < 50 THEN 'critical' ELSE 'warning' END,
        'Cache hit ratio below threshold: ' || ROUND(cache_hit_ratio, 1) || '% (threshold: 80%)',
        'cache_hit_ratio',
        cache_hit_ratio,
        80
      );
    END IF;
    
  END LOOP;
END;
$function$;

-- 5. update_system_health_metrics
CREATE OR REPLACE FUNCTION public.update_system_health_metrics()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_cache_hits BIGINT;
  total_cache_misses BIGINT;
  hit_ratio NUMERIC;
  avg_cached_response NUMERIC;
  avg_uncached_response NUMERIC;
BEGIN
  SELECT 
    COALESCE(SUM(CASE WHEN metric_name = 'cache_hit' THEN metric_value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN metric_name = 'cache_miss' THEN metric_value ELSE 0 END), 0)
  INTO total_cache_hits, total_cache_misses
  FROM public.performance_metrics
  WHERE metric_name IN ('cache_hit', 'cache_miss')
    AND captured_at >= now() - INTERVAL '1 hour';
  
  IF (total_cache_hits + total_cache_misses) > 0 THEN
    hit_ratio := (total_cache_hits::NUMERIC / (total_cache_hits + total_cache_misses)) * 100;
  ELSE
    hit_ratio := 100;
  END IF;
  
  SELECT AVG(metric_value) INTO avg_cached_response
  FROM public.performance_metrics
  WHERE metric_name = 'cached_query_time'
    AND captured_at >= now() - INTERVAL '1 hour';
  
  SELECT AVG(metric_value) INTO avg_uncached_response
  FROM public.performance_metrics
  WHERE metric_name = 'uncached_query_time'
    AND captured_at >= now() - INTERVAL '1 hour';
  
  UPDATE public.system_health
  SET 
    cache_hit_count = total_cache_hits,
    cache_miss_count = total_cache_misses,
    cache_hit_ratio = hit_ratio,
    avg_cached_response_ms = COALESCE(avg_cached_response, 0),
    avg_uncached_response_ms = COALESCE(avg_uncached_response, 0),
    last_check = now()
  WHERE id = (SELECT id FROM public.system_health ORDER BY created_at DESC LIMIT 1);
  
END;
$function$;

-- 6. get_yesterday_pte_totals
CREATE OR REPLACE FUNCTION public.get_yesterday_pte_totals(org_id uuid)
 RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
SELECT 
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date = CURRENT_DATE - 1) AS pickup_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date = CURRENT_DATE - 1
   AND manifest_id IS NULL) AS dropoff_ptes,
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date = CURRENT_DATE - 1) +
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date = CURRENT_DATE - 1
   AND manifest_id IS NULL) AS total_ptes;
$function$;

-- 7. get_today_pte_totals
CREATE OR REPLACE FUNCTION public.get_today_pte_totals(org_id uuid)
 RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
SELECT 
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date = CURRENT_DATE) AS pickup_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date = CURRENT_DATE
   AND manifest_id IS NULL) AS dropoff_ptes,
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date = CURRENT_DATE) +
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date = CURRENT_DATE
   AND manifest_id IS NULL) AS total_ptes;
$function$;

-- 8. get_weekly_pte_totals
CREATE OR REPLACE FUNCTION public.get_weekly_pte_totals(org_id uuid)
 RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
SELECT 
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date >= date_trunc('week', CURRENT_DATE)::date
   AND COALESCE(signed_at, created_at)::date <= CURRENT_DATE) AS pickup_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date >= date_trunc('week', CURRENT_DATE)::date
   AND dropoff_date::date <= CURRENT_DATE
   AND manifest_id IS NULL) AS dropoff_ptes,
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date >= date_trunc('week', CURRENT_DATE)::date
   AND COALESCE(signed_at, created_at)::date <= CURRENT_DATE) +
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date >= date_trunc('week', CURRENT_DATE)::date
   AND dropoff_date::date <= CURRENT_DATE
   AND manifest_id IS NULL) AS total_ptes;
$function$;

-- 9. get_monthly_pte_totals
CREATE OR REPLACE FUNCTION public.get_monthly_pte_totals(org_id uuid)
 RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
SELECT 
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date >= date_trunc('month', CURRENT_DATE)::date
   AND COALESCE(signed_at, created_at)::date <= CURRENT_DATE) AS pickup_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date >= date_trunc('month', CURRENT_DATE)::date
   AND dropoff_date::date <= CURRENT_DATE
   AND manifest_id IS NULL) AS dropoff_ptes,
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date >= date_trunc('month', CURRENT_DATE)::date
   AND COALESCE(signed_at, created_at)::date <= CURRENT_DATE) +
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date >= date_trunc('month', CURRENT_DATE)::date
   AND dropoff_date::date <= CURRENT_DATE
   AND manifest_id IS NULL) AS total_ptes;
$function$;

-- ADDITIONAL NOTES:
-- The following warnings require Supabase Dashboard configuration:
--
-- 1. Auth Leaked Password Protection: 
--    Go to Authentication > Settings > Enable "Leaked Password Protection"
--
-- 2. Postgres Version Upgrade:
--    Go to Database Settings > Apply the latest Postgres patches
--
-- 3. Extensions in public schema (pg_net, pg_trgm):
--    These are Supabase-managed extensions, generally safe to leave as-is
--
-- 4. Materialized views in API (mv_revenue_summary, mv_monthly_entity_rollup, mv_processing_summary):
--    These are intentionally exposed for read access. Consider adding RLS policies if needed.
