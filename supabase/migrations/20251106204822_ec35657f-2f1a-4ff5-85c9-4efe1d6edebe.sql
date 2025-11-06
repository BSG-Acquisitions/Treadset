-- Fix Function Search Path Mutable warnings
-- Add search_path to functions that are missing it

-- 1. trigger_refresh_reporting_views
CREATE OR REPLACE FUNCTION public.trigger_refresh_reporting_views()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  -- Use pg_notify to trigger async refresh
  PERFORM pg_notify('refresh_reporting_views', '');
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2. check_performance_thresholds
CREATE OR REPLACE FUNCTION public.check_performance_thresholds()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  org_record RECORD;
  avg_query_time NUMERIC;
  cache_hit_ratio NUMERIC;
  alert_message TEXT;
BEGIN
  -- Check for each organization
  FOR org_record IN SELECT DISTINCT organization_id FROM public.performance_metrics LOOP
    
    -- Check average query time over last hour
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
    
    -- Check cache hit ratio
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

-- 3. refresh_reporting_views
CREATE OR REPLACE FUNCTION public.refresh_reporting_views()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_entity_rollup;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_processing_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_revenue_summary;
END;
$function$;

-- 4. update_system_health_metrics
CREATE OR REPLACE FUNCTION public.update_system_health_metrics()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  total_cache_hits BIGINT;
  total_cache_misses BIGINT;
  hit_ratio NUMERIC;
  avg_cached_response NUMERIC;
  avg_uncached_response NUMERIC;
BEGIN
  -- Calculate cache metrics from last hour
  SELECT 
    COALESCE(SUM(CASE WHEN metric_name = 'cache_hit' THEN metric_value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN metric_name = 'cache_miss' THEN metric_value ELSE 0 END), 0)
  INTO total_cache_hits, total_cache_misses
  FROM public.performance_metrics
  WHERE metric_name IN ('cache_hit', 'cache_miss')
    AND captured_at >= now() - INTERVAL '1 hour';
  
  -- Calculate hit ratio
  IF (total_cache_hits + total_cache_misses) > 0 THEN
    hit_ratio := (total_cache_hits::NUMERIC / (total_cache_hits + total_cache_misses)) * 100;
  ELSE
    hit_ratio := 100;
  END IF;
  
  -- Calculate average response times
  SELECT AVG(metric_value) INTO avg_cached_response
  FROM public.performance_metrics
  WHERE metric_name = 'cached_query_time'
    AND captured_at >= now() - INTERVAL '1 hour';
  
  SELECT AVG(metric_value) INTO avg_uncached_response
  FROM public.performance_metrics
  WHERE metric_name = 'uncached_query_time'
    AND captured_at >= now() - INTERVAL '1 hour';
  
  -- Update system_health
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

-- 5. log_slow_query - already has search_path set in the definition in useful-context
-- But let's make sure it's explicit
CREATE OR REPLACE FUNCTION public.log_slow_query(
  p_query_name text, 
  p_execution_time_ms integer, 
  p_rows_returned integer DEFAULT NULL::integer, 
  p_query_params jsonb DEFAULT NULL::jsonb, 
  p_optimization text DEFAULT NULL::text
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  log_id UUID;
BEGIN
  -- Only log if query is slow (>250ms)
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

-- Fix Materialized View in API warnings
-- Enable RLS on materialized views to control access

ALTER MATERIALIZED VIEW public.mv_revenue_summary OWNER TO postgres;
ALTER MATERIALIZED VIEW public.mv_monthly_entity_rollup OWNER TO postgres;
ALTER MATERIALIZED VIEW public.mv_processing_summary OWNER TO postgres;

-- Revoke public access and only allow authenticated users
REVOKE ALL ON public.mv_revenue_summary FROM anon;
REVOKE ALL ON public.mv_monthly_entity_rollup FROM anon;
REVOKE ALL ON public.mv_processing_summary FROM anon;

GRANT SELECT ON public.mv_revenue_summary TO authenticated;
GRANT SELECT ON public.mv_monthly_entity_rollup TO authenticated;
GRANT SELECT ON public.mv_processing_summary TO authenticated;