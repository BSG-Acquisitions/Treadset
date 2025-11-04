
-- Performance Logs Table
CREATE TABLE IF NOT EXISTS public.performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_name TEXT NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  rows_returned INTEGER,
  query_params JSONB,
  optimization_applied TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_performance_logs_query ON public.performance_logs(query_name);
CREATE INDEX idx_performance_logs_time ON public.performance_logs(execution_time_ms DESC);
CREATE INDEX idx_performance_logs_created ON public.performance_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users"
  ON public.performance_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Composite Indexes for Intelligence Queries
-- (Only create if they don't exist and provide >10% benefit)

-- Manifests: Frequently queried by org + status + date
CREATE INDEX IF NOT EXISTS idx_manifests_org_status_signed 
  ON public.manifests(organization_id, status, signed_at DESC NULLS LAST);

-- Manifests: For revenue calculations (client + status)
CREATE INDEX IF NOT EXISTS idx_manifests_client_status_signed 
  ON public.manifests(client_id, status, signed_at DESC NULLS LAST);

-- Pickups: For analytics (org + date + status)
CREATE INDEX IF NOT EXISTS idx_pickups_org_date_status 
  ON public.pickups(organization_id, pickup_date DESC, status);

-- Pickups: For client analytics (client + date)
CREATE INDEX IF NOT EXISTS idx_pickups_client_date 
  ON public.pickups(client_id, pickup_date DESC);

-- Client Summaries: For reporting (client + year + month)
CREATE INDEX IF NOT EXISTS idx_client_summaries_client_period 
  ON public.client_summaries(client_id, year DESC, month DESC);

-- Assignments: For driver dashboard (driver + date + status)
CREATE INDEX IF NOT EXISTS idx_assignments_driver_date_status 
  ON public.assignments(driver_id, scheduled_date DESC, status);

-- AI Query Logs: For performance tracking (org + created + success)
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_org_created_success 
  ON public.ai_query_logs(organization_id, created_at DESC, success);

-- Function to log slow queries automatically
CREATE OR REPLACE FUNCTION log_slow_query(
  p_query_name TEXT,
  p_execution_time_ms INTEGER,
  p_rows_returned INTEGER DEFAULT NULL,
  p_query_params JSONB DEFAULT NULL,
  p_optimization TEXT DEFAULT NULL
) RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Analyze tables after index creation
ANALYZE public.manifests;
ANALYZE public.pickups;
ANALYZE public.assignments;
ANALYZE public.clients;
ANALYZE public.client_summaries;
ANALYZE public.ai_query_logs;

COMMENT ON TABLE public.performance_logs IS 'Tracks query performance for optimization analysis';
COMMENT ON FUNCTION log_slow_query IS 'Logs queries exceeding 250ms threshold for analysis';
