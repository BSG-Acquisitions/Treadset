-- Create client_invites table for portal invitation tokens
CREATE TABLE public.client_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  sent_to_email TEXT, -- The email it was sent to (for reference only)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_client_invites_token ON public.client_invites(token);
CREATE INDEX idx_client_invites_client_id ON public.client_invites(client_id);
CREATE INDEX idx_client_invites_organization_id ON public.client_invites(organization_id);

-- Enable RLS
ALTER TABLE public.client_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Service role can do everything
CREATE POLICY "client_invites_service_role" ON public.client_invites
  FOR ALL USING (current_setting('role') = 'service_role');

-- Org admins/ops_managers can view and create invites
CREATE POLICY "client_invites_org_manage" ON public.client_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND uo.organization_id = client_invites.organization_id
        AND uo.role IN ('admin', 'ops_manager', 'sales')
    )
  );

-- Create function to validate client invite token
CREATE OR REPLACE FUNCTION public.validate_client_invite_token(invite_token text)
RETURNS TABLE(
  id uuid,
  client_id uuid,
  organization_id uuid,
  organization_name text,
  organization_logo text,
  company_name text,
  sent_to_email text,
  is_valid boolean,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Look up the invite
  SELECT 
    ci.id,
    ci.client_id,
    ci.organization_id,
    o.name as organization_name,
    o.logo_url as organization_logo,
    c.company_name,
    ci.sent_to_email,
    ci.expires_at,
    ci.used_at
  INTO invite_record
  FROM client_invites ci
  JOIN organizations o ON ci.organization_id = o.id
  JOIN clients c ON ci.client_id = c.id
  WHERE ci.token = invite_token;

  -- Check if invite exists
  IF invite_record IS NULL THEN
    RETURN QUERY SELECT 
      NULL::UUID, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, 
      NULL::TEXT, NULL::TEXT, FALSE, 'Invalid invitation link'::TEXT;
    RETURN;
  END IF;

  -- Check if already used
  IF invite_record.used_at IS NOT NULL THEN
    RETURN QUERY SELECT 
      invite_record.id, invite_record.client_id, invite_record.organization_id,
      invite_record.organization_name, invite_record.organization_logo,
      invite_record.company_name, invite_record.sent_to_email,
      FALSE, 'This invitation has already been used'::TEXT;
    RETURN;
  END IF;

  -- Check if expired
  IF invite_record.expires_at < NOW() THEN
    RETURN QUERY SELECT 
      invite_record.id, invite_record.client_id, invite_record.organization_id,
      invite_record.organization_name, invite_record.organization_logo,
      invite_record.company_name, invite_record.sent_to_email,
      FALSE, 'This invitation has expired'::TEXT;
    RETURN;
  END IF;

  -- Valid invite
  RETURN QUERY SELECT 
    invite_record.id, invite_record.client_id, invite_record.organization_id,
    invite_record.organization_name, invite_record.organization_logo,
    invite_record.company_name, invite_record.sent_to_email,
    TRUE, NULL::TEXT;
END;
$$;

-- Create function to claim client invite token
CREATE OR REPLACE FUNCTION public.claim_client_invite_token(invite_token text, claiming_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Get and lock the invite record
  SELECT * INTO invite_record
  FROM client_invites
  WHERE token = invite_token
  FOR UPDATE;

  -- Validate
  IF invite_record IS NULL OR invite_record.used_at IS NOT NULL OR invite_record.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;

  -- Mark as used
  UPDATE client_invites
  SET used_at = NOW(), used_by = claiming_user_id, updated_at = NOW()
  WHERE id = invite_record.id;

  -- Link the user to the client
  UPDATE clients
  SET user_id = claiming_user_id, updated_at = NOW()
  WHERE id = invite_record.client_id;

  -- Add user to organization with client role
  INSERT INTO user_organization_roles (user_id, organization_id, role)
  VALUES (claiming_user_id, invite_record.organization_id, 'client')
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'client';

  RETURN TRUE;
END;
$$;