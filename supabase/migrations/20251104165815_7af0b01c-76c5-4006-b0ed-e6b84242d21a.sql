-- Create performance_metrics table for tracking system performance
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT NOT NULL DEFAULT 'ms',
  metadata JSONB DEFAULT '{}'::jsonb,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_captured_at ON public.performance_metrics(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_org_metric ON public.performance_metrics(organization_id, metric_name, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON public.performance_metrics(metric_name);

-- Create performance_alerts table for tracking alerts
CREATE TABLE IF NOT EXISTS public.performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  metric_name TEXT,
  metric_value NUMERIC,
  threshold NUMERIC,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for alerts
CREATE INDEX IF NOT EXISTS idx_performance_alerts_org ON public.performance_alerts(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_unresolved ON public.performance_alerts(organization_id, resolved, created_at DESC) WHERE resolved = false;

-- Enable RLS
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for performance_metrics
CREATE POLICY "Org members can view performance metrics"
  ON public.performance_metrics
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage performance metrics"
  ON public.performance_metrics
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for performance_alerts
CREATE POLICY "Admins can view performance alerts"
  ON public.performance_alerts
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND uo.role IN ('admin', 'ops_manager')
    )
  );

CREATE POLICY "Service role can manage performance alerts"
  ON public.performance_alerts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to check performance thresholds and create alerts
CREATE OR REPLACE FUNCTION public.check_performance_thresholds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Add trigger to system_health to track overall health
CREATE OR REPLACE FUNCTION public.update_system_health_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

COMMENT ON TABLE public.performance_metrics IS 'Tracks system performance metrics over time for monitoring and analysis';
COMMENT ON TABLE public.performance_alerts IS 'Stores performance alerts when thresholds are exceeded';
COMMENT ON FUNCTION public.check_performance_thresholds() IS 'Checks performance metrics and creates alerts when thresholds are exceeded';
COMMENT ON FUNCTION public.update_system_health_metrics() IS 'Updates system_health table with aggregated performance metrics';