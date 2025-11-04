-- Create hauler_reliability_beta table for reliability scoring
CREATE TABLE IF NOT EXISTS public.hauler_reliability_beta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hauler_id UUID NOT NULL REFERENCES public.haulers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reliability_score INTEGER NOT NULL CHECK (reliability_score >= 0 AND reliability_score <= 100),
  on_time_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  manifest_accuracy_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  payment_promptness_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_dropoffs INTEGER NOT NULL DEFAULT 0,
  on_time_dropoffs INTEGER NOT NULL DEFAULT 0,
  accurate_manifests INTEGER NOT NULL DEFAULT 0,
  prompt_payments INTEGER NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hauler_id, organization_id)
);

-- Indexes for performance
CREATE INDEX idx_hauler_reliability_hauler ON public.hauler_reliability_beta(hauler_id);
CREATE INDEX idx_hauler_reliability_org ON public.hauler_reliability_beta(organization_id);
CREATE INDEX idx_hauler_reliability_score ON public.hauler_reliability_beta(reliability_score DESC);

-- Enable RLS
ALTER TABLE public.hauler_reliability_beta ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view hauler reliability"
  ON public.hauler_reliability_beta FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT uo.organization_id FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage hauler reliability"
  ON public.hauler_reliability_beta FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_hauler_reliability_updated_at
  BEFORE UPDATE ON public.hauler_reliability_beta
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();