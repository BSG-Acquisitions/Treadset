-- Create capacity_preview_beta table for caching capacity predictions
CREATE TABLE IF NOT EXISTS capacity_preview_beta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  forecast_date date NOT NULL,
  predicted_tire_volume integer DEFAULT 0,
  predicted_truck_capacity integer DEFAULT 0,
  capacity_percentage numeric DEFAULT 0,
  capacity_status text DEFAULT 'normal',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, forecast_date)
);

-- Enable RLS
ALTER TABLE capacity_preview_beta ENABLE ROW LEVEL SECURITY;

-- Admin and Ops can view capacity predictions
CREATE POLICY "Admin and Ops can view capacity predictions"
  ON capacity_preview_beta
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

-- Service role can manage capacity predictions
CREATE POLICY "Service role can manage capacity predictions"
  ON capacity_preview_beta
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_capacity_preview_org_date ON capacity_preview_beta(organization_id, forecast_date);