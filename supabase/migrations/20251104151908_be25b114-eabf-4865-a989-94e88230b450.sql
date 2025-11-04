-- Create ai_insights_beta table for storing daily operational summaries
CREATE TABLE IF NOT EXISTS public.ai_insights_beta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  insights_data JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_insights_beta ENABLE ROW LEVEL SECURITY;

-- Admin and Ops Manager can view insights
CREATE POLICY "Admin and Ops can view AI insights"
  ON public.ai_insights_beta
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

-- Service role can manage insights
CREATE POLICY "Service role can manage AI insights"
  ON public.ai_insights_beta
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_insights_org_generated 
  ON public.ai_insights_beta(organization_id, generated_at DESC);