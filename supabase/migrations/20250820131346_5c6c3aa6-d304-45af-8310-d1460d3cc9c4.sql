-- Create workflow tracking table for followup scheduling
CREATE TABLE public.client_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  workflow_type TEXT NOT NULL DEFAULT 'followup',
  status TEXT NOT NULL DEFAULT 'active',
  next_contact_date DATE,
  last_contact_date DATE,
  contact_frequency_days INTEGER DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_workflows ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can access workflow data in their organizations" 
ON public.client_workflows 
FOR ALL 
USING ((auth.uid() IS NULL) OR (organization_id IN ( 
  SELECT uo.organization_id
  FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
)));

-- Create trigger for updated_at
CREATE TRIGGER update_client_workflows_updated_at
  BEFORE UPDATE ON public.client_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();