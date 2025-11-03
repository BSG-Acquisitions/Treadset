-- Create system_updates table for tracking deployments
CREATE TABLE IF NOT EXISTS public.system_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sandboxed', 'verified', 'live', 'failed')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  impacted_tables TEXT[],
  test_results JSONB,
  deployed_by UUID REFERENCES public.users(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_updates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage system updates
CREATE POLICY "Admins can manage system updates"
ON public.system_updates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND uo.organization_id = system_updates.organization_id
    AND uo.role = 'admin'
  )
);

-- Create index for performance
CREATE INDEX idx_system_updates_org ON public.system_updates(organization_id);
CREATE INDEX idx_system_updates_status ON public.system_updates(status);

-- Add trigger for updated_at
CREATE TRIGGER update_system_updates_updated_at
BEFORE UPDATE ON public.system_updates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();