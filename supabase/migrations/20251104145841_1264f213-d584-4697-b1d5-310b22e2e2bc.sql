-- Create manifest_tasks_beta table for follow-up task tracking
CREATE TABLE IF NOT EXISTS public.manifest_tasks_beta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id UUID NOT NULL REFERENCES public.manifests(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_role app_role NOT NULL DEFAULT 'receptionist',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'escalated')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  days_overdue INTEGER NOT NULL DEFAULT 0,
  escalation_level INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create manifest_followups_beta table for audit trail
CREATE TABLE IF NOT EXISTS public.manifest_followups_beta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id UUID NOT NULL REFERENCES public.manifests(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.manifest_tasks_beta(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('reminder_sent', 'task_created', 'task_escalated', 'task_resolved', 'alert_sent')),
  performed_by UUID REFERENCES public.users(id),
  assigned_to UUID REFERENCES public.users(id),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_manifest_tasks_manifest ON public.manifest_tasks_beta(manifest_id);
CREATE INDEX idx_manifest_tasks_org ON public.manifest_tasks_beta(organization_id);
CREATE INDEX idx_manifest_tasks_assigned ON public.manifest_tasks_beta(assigned_to);
CREATE INDEX idx_manifest_tasks_status ON public.manifest_tasks_beta(status);
CREATE INDEX idx_manifest_followups_manifest ON public.manifest_followups_beta(manifest_id);
CREATE INDEX idx_manifest_followups_task ON public.manifest_followups_beta(task_id);
CREATE INDEX idx_manifest_followups_org ON public.manifest_followups_beta(organization_id);

-- Enable RLS
ALTER TABLE public.manifest_tasks_beta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifest_followups_beta ENABLE ROW LEVEL SECURITY;

-- RLS Policies for manifest_tasks_beta
CREATE POLICY "Org members can view tasks"
  ON public.manifest_tasks_beta FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT uo.organization_id FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and assigned users can update tasks"
  ON public.manifest_tasks_beta FOR UPDATE
  USING (
    organization_id IN (
      SELECT uo.organization_id FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND (uo.role IN ('admin', 'ops_manager') OR u.id = assigned_to)
    )
  );

CREATE POLICY "Service role can manage tasks"
  ON public.manifest_tasks_beta FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for manifest_followups_beta
CREATE POLICY "Org members can view followups"
  ON public.manifest_followups_beta FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    organization_id IN (
      SELECT uo.organization_id FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage followups"
  ON public.manifest_followups_beta FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_manifest_tasks_updated_at
  BEFORE UPDATE ON public.manifest_tasks_beta
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();