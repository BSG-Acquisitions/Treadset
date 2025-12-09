-- Phase 1: Add manifest fields to trailer_events table
ALTER TABLE public.trailer_events
ADD COLUMN IF NOT EXISTS manifest_number TEXT,
ADD COLUMN IF NOT EXISTS manifest_pdf_path TEXT,
ADD COLUMN IF NOT EXISTS signature_path TEXT,
ADD COLUMN IF NOT EXISTS signer_name TEXT;

-- Create index for manifest lookups
CREATE INDEX IF NOT EXISTS idx_trailer_events_manifest_number 
ON public.trailer_events(manifest_number);

-- Create index for events needing manifests (pickup_full, drop_full)
CREATE INDEX IF NOT EXISTS idx_trailer_events_type_timestamp 
ON public.trailer_events(event_type, timestamp DESC);

-- Create a function to generate trailer manifest numbers
CREATE OR REPLACE FUNCTION public.generate_trailer_manifest_number(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_number INTEGER;
  date_prefix TEXT;
  manifest_number TEXT;
BEGIN
  date_prefix := 'TM-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(trailer_events.manifest_number FROM '^TM-\d{8}-(\d+)$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.trailer_events
  WHERE organization_id = org_id 
  AND manifest_number ~ ('^TM-\d{8}-\d+$');
  
  manifest_number := date_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN manifest_number;
END;
$$;

-- Create trailer_alerts table for notification system
CREATE TABLE IF NOT EXISTS public.trailer_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  trailer_id UUID NOT NULL REFERENCES public.trailers(id),
  alert_type TEXT NOT NULL, -- 'waiting_too_long', 'route_not_started', 'full_idle'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  message TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on trailer_alerts
ALTER TABLE public.trailer_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for trailer_alerts
CREATE POLICY "trailer_alerts_org_access" ON public.trailer_alerts
FOR ALL USING (
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
  )
);

-- Create indexes for trailer_alerts
CREATE INDEX IF NOT EXISTS idx_trailer_alerts_org_id ON public.trailer_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_trailer_alerts_trailer_id ON public.trailer_alerts(trailer_id);
CREATE INDEX IF NOT EXISTS idx_trailer_alerts_unresolved ON public.trailer_alerts(organization_id, is_resolved) WHERE is_resolved = false;

-- Create trigger to update updated_at
CREATE OR REPLACE TRIGGER update_trailer_alerts_updated_at
BEFORE UPDATE ON public.trailer_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();