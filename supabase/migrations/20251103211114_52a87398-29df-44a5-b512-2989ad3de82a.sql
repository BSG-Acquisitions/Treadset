-- Create beta tables for live deployment
-- These tables run in parallel with existing systems

-- Enhanced Notifications Beta (parallel to existing notifications)
CREATE TABLE IF NOT EXISTS public.notifications_beta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- success, error, warning, info
  priority TEXT DEFAULT 'medium', -- low, medium, high
  action_link TEXT,
  related_id UUID,
  related_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  role_visibility TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client Health Scores (new feature)
CREATE TABLE IF NOT EXISTS public.client_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  days_since_last_pickup INTEGER,
  total_pickups INTEGER DEFAULT 0,
  avg_revenue_per_pickup NUMERIC(10,2) DEFAULT 0,
  risk_level TEXT DEFAULT 'low', -- low, medium, high
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, organization_id)
);

-- Manifest Follow-Up Alerts Beta (parallel manifest tracking)
CREATE TABLE IF NOT EXISTS public.manifest_alerts_beta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id UUID NOT NULL REFERENCES public.manifests(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- missing_signature, incomplete_data, overdue
  priority TEXT DEFAULT 'medium', -- low, medium, high
  days_overdue INTEGER DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications_beta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifest_alerts_beta ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications_beta
CREATE POLICY "Users can view their own notifications_beta"
  ON public.notifications_beta FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications_beta"
  ON public.notifications_beta FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage notifications_beta"
  ON public.notifications_beta FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for client_health_scores
CREATE POLICY "Org members can view client health scores"
  ON public.client_health_scores FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT uo.organization_id FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage client health scores"
  ON public.client_health_scores FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for manifest_alerts_beta
CREATE POLICY "Org members can view manifest alerts"
  ON public.manifest_alerts_beta FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT uo.organization_id FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage manifest alerts"
  ON public.manifest_alerts_beta FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = manifest_alerts_beta.organization_id
      AND uo.role IN ('admin', 'ops_manager')
    )
  );

-- Indexes for performance
CREATE INDEX idx_notifications_beta_user_id ON public.notifications_beta(user_id);
CREATE INDEX idx_notifications_beta_org_id ON public.notifications_beta(organization_id);
CREATE INDEX idx_notifications_beta_is_read ON public.notifications_beta(is_read);
CREATE INDEX idx_client_health_scores_client_id ON public.client_health_scores(client_id);
CREATE INDEX idx_client_health_scores_org_id ON public.client_health_scores(organization_id);
CREATE INDEX idx_manifest_alerts_beta_manifest_id ON public.manifest_alerts_beta(manifest_id);
CREATE INDEX idx_manifest_alerts_beta_org_id ON public.manifest_alerts_beta(organization_id);

-- Update triggers
CREATE TRIGGER update_notifications_beta_updated_at
  BEFORE UPDATE ON public.notifications_beta
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

CREATE TRIGGER update_client_health_scores_updated_at
  BEFORE UPDATE ON public.client_health_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manifest_alerts_beta_updated_at
  BEFORE UPDATE ON public.manifest_alerts_beta
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop sandbox schema and tables
DROP SCHEMA IF EXISTS sandbox_ CASCADE;

-- Log deployment
INSERT INTO public.system_updates (
  module_name,
  status,
  notes,
  impacted_tables,
  organization_id
) 
SELECT 
  'Inline Live Build - All Beta Modules',
  'live',
  'Safe merge executed: Enhanced Notifications Beta, Client Health Score, Manifest Follow-Up Alerts, Missing Data Intelligence deployed to production with beta namespace isolation.',
  ARRAY['notifications_beta', 'client_health_scores', 'manifest_alerts_beta', 'data_quality_flags'],
  id
FROM public.organizations
LIMIT 1;