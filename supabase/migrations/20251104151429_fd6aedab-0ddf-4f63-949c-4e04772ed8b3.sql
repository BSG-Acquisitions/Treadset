-- Create ai_query_logs_beta table for tracking AI queries
CREATE TABLE IF NOT EXISTS public.ai_query_logs_beta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  response_summary TEXT,
  query_type TEXT,
  execution_time_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_ai_query_logs_user ON public.ai_query_logs_beta(user_id);
CREATE INDEX idx_ai_query_logs_org ON public.ai_query_logs_beta(organization_id);
CREATE INDEX idx_ai_query_logs_created ON public.ai_query_logs_beta(created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_query_logs_beta ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view AI query logs"
  ON public.ai_query_logs_beta FOR SELECT
  USING (
    organization_id IN (
      SELECT uo.organization_id FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND uo.role IN ('admin', 'ops_manager', 'sales')
    )
  );

CREATE POLICY "Service role can manage AI query logs"
  ON public.ai_query_logs_beta FOR ALL
  USING (true)
  WITH CHECK (true);