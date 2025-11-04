-- Create client_risk_scores_beta table
CREATE TABLE IF NOT EXISTS public.client_risk_scores_beta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  pickup_frequency_decline NUMERIC,
  avg_payment_delay_days NUMERIC,
  contact_gap_ratio NUMERIC,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Add indexes
CREATE INDEX idx_client_risk_scores_client ON client_risk_scores_beta(client_id);
CREATE INDEX idx_client_risk_scores_org ON client_risk_scores_beta(organization_id);
CREATE INDEX idx_client_risk_scores_risk ON client_risk_scores_beta(risk_score);

-- RLS policies
ALTER TABLE client_risk_scores_beta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin, Sales, Ops can view risk scores"
  ON client_risk_scores_beta
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND uo.role IN ('admin', 'sales', 'ops_manager')
    )
  );

CREATE POLICY "Service role can manage risk scores"
  ON client_risk_scores_beta
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_client_risk_scores_beta_updated_at
  BEFORE UPDATE ON client_risk_scores_beta
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();