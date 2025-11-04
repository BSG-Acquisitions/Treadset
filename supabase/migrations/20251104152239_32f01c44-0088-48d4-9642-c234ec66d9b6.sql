-- Create driver_performance_beta table for storing computed driver metrics
CREATE TABLE IF NOT EXISTS public.driver_performance_beta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Performance Metrics
  avg_stops_per_day NUMERIC(10,2) DEFAULT 0,
  on_time_rate NUMERIC(5,2) DEFAULT 0, -- percentage 0-100
  avg_pickup_duration_minutes INTEGER DEFAULT 0,
  avg_mileage_per_stop NUMERIC(10,2) DEFAULT 0,
  
  -- Supporting Data
  total_assignments INTEGER DEFAULT 0,
  completed_assignments INTEGER DEFAULT 0,
  on_time_arrivals INTEGER DEFAULT 0,
  total_miles_driven NUMERIC(10,2) DEFAULT 0,
  
  -- Trend Data (last 30 days, stored as JSON array)
  daily_stops_trend JSONB DEFAULT '[]'::jsonb,
  on_time_trend JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  calculation_period_start DATE NOT NULL,
  calculation_period_end DATE NOT NULL,
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_driver_org_period UNIQUE(driver_id, organization_id, calculation_period_end)
);

-- Enable RLS
ALTER TABLE public.driver_performance_beta ENABLE ROW LEVEL SECURITY;

-- Only admins and ops managers can view driver performance
CREATE POLICY "Admins and Ops can view driver performance"
  ON public.driver_performance_beta
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND organization_id IN (
      SELECT uo.organization_id 
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid() 
      AND uo.role IN ('admin', 'ops_manager')
    )
  );

-- Service role can manage performance data
CREATE POLICY "Service role can manage driver performance"
  ON public.driver_performance_beta
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_driver_performance_driver 
  ON public.driver_performance_beta(driver_id, calculation_period_end DESC);
  
CREATE INDEX IF NOT EXISTS idx_driver_performance_org_calc 
  ON public.driver_performance_beta(organization_id, last_calculated_at DESC);