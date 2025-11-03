-- Create data_quality_flags table for tracking incomplete records
CREATE TABLE IF NOT EXISTS public.data_quality_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('client', 'pickup', 'manifest', 'location')),
  record_id UUID NOT NULL,
  issue TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.data_quality_flags ENABLE ROW LEVEL SECURITY;

-- Admin can manage all flags
CREATE POLICY "Admins can manage data quality flags"
ON public.data_quality_flags
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND uo.organization_id = data_quality_flags.organization_id
    AND uo.role = 'admin'
  )
);

-- Service role can access all
CREATE POLICY "Service role can access data quality flags"
ON public.data_quality_flags
FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_data_quality_flags_org ON public.data_quality_flags(organization_id);
CREATE INDEX idx_data_quality_flags_record ON public.data_quality_flags(record_type, record_id);
CREATE INDEX idx_data_quality_flags_severity ON public.data_quality_flags(severity, detected_at DESC);
CREATE INDEX idx_data_quality_flags_unresolved ON public.data_quality_flags(organization_id, resolved_at) 
  WHERE resolved_at IS NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_data_quality_flags_updated_at
BEFORE UPDATE ON public.data_quality_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.data_quality_flags IS 'Tracks data quality issues for manual review';
COMMENT ON COLUMN public.data_quality_flags.record_type IS 'Type of record: client, pickup, manifest, location';
COMMENT ON COLUMN public.data_quality_flags.severity IS 'Issue severity: low, medium, high';
COMMENT ON COLUMN public.data_quality_flags.resolved_at IS 'When the issue was marked as reviewed/resolved';