-- Create audit_events table for tracking all changes
CREATE TABLE public.audit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  user_id UUID REFERENCES public.users(id),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_events
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Audit events policy - users can only see events from their organization
CREATE POLICY "Users can view audit events in their organization" 
ON public.audit_events 
FOR SELECT 
USING ((auth.uid() IS NULL) OR (organization_id IN (
  SELECT uo.organization_id
  FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
)));

-- Only system can insert audit events
CREATE POLICY "System can insert audit events" 
ON public.audit_events 
FOR INSERT 
WITH CHECK (true);