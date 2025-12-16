-- Create organization_invites table for team invitations
CREATE TABLE public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT,
  role app_role NOT NULL DEFAULT 'driver',
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invite_type TEXT NOT NULL DEFAULT 'email' CHECK (invite_type IN ('email', 'qr_code')),
  personal_message TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_by UUID REFERENCES public.users(id),
  sent_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins and ops_managers can manage invites for their organization
CREATE POLICY "org_invites_manage" ON public.organization_invites
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
    AND uo.organization_id = organization_invites.organization_id
    AND uo.role IN ('admin', 'ops_manager')
  )
);

-- Anyone can validate a token (for signup page) - using service role or public function
CREATE POLICY "org_invites_validate_token" ON public.organization_invites
FOR SELECT USING (
  -- Allow service role full access
  (SELECT current_setting('role', true)) = 'service_role'
  OR
  -- Allow anyone to look up by token (for invite validation)
  token IS NOT NULL
);

-- Create function to validate and use invite token
CREATE OR REPLACE FUNCTION public.validate_invite_token(invite_token TEXT)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  organization_name TEXT,
  organization_logo TEXT,
  email TEXT,
  role app_role,
  is_valid BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Look up the invite
  SELECT 
    oi.id,
    oi.organization_id,
    o.name as organization_name,
    o.logo_url as organization_logo,
    oi.email,
    oi.role,
    oi.expires_at,
    oi.used_at
  INTO invite_record
  FROM organization_invites oi
  JOIN organizations o ON oi.organization_id = o.id
  WHERE oi.token = invite_token;

  -- Check if invite exists
  IF invite_record IS NULL THEN
    RETURN QUERY SELECT 
      NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 
      NULL::app_role, FALSE, 'Invalid invite token'::TEXT;
    RETURN;
  END IF;

  -- Check if already used
  IF invite_record.used_at IS NOT NULL THEN
    RETURN QUERY SELECT 
      invite_record.id, invite_record.organization_id, invite_record.organization_name,
      invite_record.organization_logo, invite_record.email, invite_record.role,
      FALSE, 'This invitation has already been used'::TEXT;
    RETURN;
  END IF;

  -- Check if expired
  IF invite_record.expires_at < NOW() THEN
    RETURN QUERY SELECT 
      invite_record.id, invite_record.organization_id, invite_record.organization_name,
      invite_record.organization_logo, invite_record.email, invite_record.role,
      FALSE, 'This invitation has expired'::TEXT;
    RETURN;
  END IF;

  -- Valid invite
  RETURN QUERY SELECT 
    invite_record.id, invite_record.organization_id, invite_record.organization_name,
    invite_record.organization_logo, invite_record.email, invite_record.role,
    TRUE, NULL::TEXT;
END;
$$;

-- Create function to claim invite after signup
CREATE OR REPLACE FUNCTION public.claim_invite_token(invite_token TEXT, claiming_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Get and lock the invite record
  SELECT * INTO invite_record
  FROM organization_invites
  WHERE token = invite_token
  FOR UPDATE;

  -- Validate
  IF invite_record IS NULL OR invite_record.used_at IS NOT NULL OR invite_record.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;

  -- Mark as used
  UPDATE organization_invites
  SET used_at = NOW(), used_by = claiming_user_id, updated_at = NOW()
  WHERE id = invite_record.id;

  -- Add user to organization with specified role
  INSERT INTO user_organization_roles (user_id, organization_id, role)
  VALUES (claiming_user_id, invite_record.organization_id, invite_record.role)
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = invite_record.role;

  RETURN TRUE;
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_organization_invites_updated_at
BEFORE UPDATE ON public.organization_invites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for token lookup
CREATE INDEX idx_organization_invites_token ON public.organization_invites(token);
CREATE INDEX idx_organization_invites_org ON public.organization_invites(organization_id);
CREATE INDEX idx_organization_invites_email ON public.organization_invites(email) WHERE email IS NOT NULL;