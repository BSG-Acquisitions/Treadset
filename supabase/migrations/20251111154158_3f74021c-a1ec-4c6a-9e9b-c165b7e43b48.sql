-- Create table to store learned client pickup patterns
CREATE TABLE IF NOT EXISTS public.client_pickup_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Pattern metadata
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'irregular')),
  confidence_score NUMERIC NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  
  -- Timing data
  typical_day_of_week INTEGER CHECK (typical_day_of_week >= 0 AND typical_day_of_week <= 6), -- 0=Sunday, 6=Saturday
  typical_week_of_month INTEGER CHECK (typical_week_of_month >= 1 AND typical_week_of_month <= 4),
  
  -- Historical data
  last_pickup_date DATE,
  average_days_between_pickups NUMERIC,
  total_pickups_analyzed INTEGER NOT NULL DEFAULT 0,
  
  -- Tracking
  last_analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id, client_id)
);

-- Enable RLS
ALTER TABLE public.client_pickup_patterns ENABLE ROW LEVEL SECURITY;

-- Allow org members to view patterns
CREATE POLICY "Org members can view pickup patterns"
  ON public.client_pickup_patterns
  FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Service role can manage patterns
CREATE POLICY "Service role can manage pickup patterns"
  ON public.client_pickup_patterns
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_client_pickup_patterns_org_client ON public.client_pickup_patterns(organization_id, client_id);
CREATE INDEX idx_client_pickup_patterns_frequency ON public.client_pickup_patterns(organization_id, frequency) WHERE frequency != 'irregular';

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_client_pickup_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_client_pickup_patterns_updated_at
  BEFORE UPDATE ON public.client_pickup_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_client_pickup_patterns_updated_at();