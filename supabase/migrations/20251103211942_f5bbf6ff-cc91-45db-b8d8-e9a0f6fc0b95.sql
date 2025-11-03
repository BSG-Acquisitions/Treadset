-- Phase 2: Intelligence Modules (Beta Tables)
-- Read-only from production, writes isolated to beta namespace

-- 1. Pickup Pattern Intelligence
CREATE TABLE IF NOT EXISTS public.pickup_patterns_beta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL, -- weekly, biweekly, monthly, seasonal
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  predicted_next_pickup DATE,
  avg_days_between_pickups INTEGER,
  seasonal_trend JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Revenue Forecasting
CREATE TABLE IF NOT EXISTS public.revenue_forecasts_beta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  forecast_month DATE NOT NULL,
  predicted_revenue NUMERIC(10,2),
  confidence_level TEXT DEFAULT 'medium', -- low, medium, high
  based_on_months INTEGER DEFAULT 6,
  growth_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Client Engagement Tracking
CREATE TABLE IF NOT EXISTS public.client_engagement_beta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),
  last_contact_date DATE,
  contact_frequency INTEGER, -- days
  response_rate NUMERIC(5,2),
  risk_status TEXT DEFAULT 'active', -- active, at_risk, churned
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, organization_id)
);

-- 4. Operational Efficiency Metrics
CREATE TABLE IF NOT EXISTS public.operational_metrics_beta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_pickups INTEGER DEFAULT 0,
  completed_on_time INTEGER DEFAULT 0,
  avg_completion_time_hours NUMERIC(5,2),
  driver_utilization_pct NUMERIC(5,2),
  route_efficiency_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, metric_date)
);

-- Enable RLS
ALTER TABLE public.pickup_patterns_beta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_forecasts_beta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_engagement_beta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_metrics_beta ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members view pickup patterns"
  ON public.pickup_patterns_beta FOR SELECT
  USING (organization_id IN (
    SELECT uo.organization_id FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id WHERE u.auth_user_id = auth.uid()
  ));

CREATE POLICY "Service role manages pickup patterns"
  ON public.pickup_patterns_beta FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Org members view revenue forecasts"
  ON public.revenue_forecasts_beta FOR SELECT
  USING (organization_id IN (
    SELECT uo.organization_id FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id WHERE u.auth_user_id = auth.uid()
  ));

CREATE POLICY "Service role manages revenue forecasts"
  ON public.revenue_forecasts_beta FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Org members view engagement"
  ON public.client_engagement_beta FOR SELECT
  USING (organization_id IN (
    SELECT uo.organization_id FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id WHERE u.auth_user_id = auth.uid()
  ));

CREATE POLICY "Service role manages engagement"
  ON public.client_engagement_beta FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Org members view metrics"
  ON public.operational_metrics_beta FOR SELECT
  USING (organization_id IN (
    SELECT uo.organization_id FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id WHERE u.auth_user_id = auth.uid()
  ));

CREATE POLICY "Service role manages metrics"
  ON public.operational_metrics_beta FOR ALL
  USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_pickup_patterns_client ON public.pickup_patterns_beta(client_id);
CREATE INDEX idx_revenue_forecasts_month ON public.revenue_forecasts_beta(forecast_month);
CREATE INDEX idx_client_engagement_client ON public.client_engagement_beta(client_id);
CREATE INDEX idx_operational_metrics_date ON public.operational_metrics_beta(metric_date);

-- Update triggers
CREATE TRIGGER update_pickup_patterns_updated_at
  BEFORE UPDATE ON public.pickup_patterns_beta
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revenue_forecasts_updated_at
  BEFORE UPDATE ON public.revenue_forecasts_beta
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_engagement_updated_at
  BEFORE UPDATE ON public.client_engagement_beta
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operational_metrics_updated_at
  BEFORE UPDATE ON public.operational_metrics_beta
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Log Phase 2 deployment
INSERT INTO public.system_updates (module_name, status, notes, impacted_tables, organization_id)
SELECT 
  'Phase 2: Intelligence Modules',
  'live',
  'Four intelligence modules deployed with beta isolation: Pickup Pattern Intelligence, Revenue Forecasting, Client Engagement Tracking, Operational Efficiency Metrics',
  ARRAY['pickup_patterns_beta', 'revenue_forecasts_beta', 'client_engagement_beta', 'operational_metrics_beta'],
  id
FROM public.organizations LIMIT 1;