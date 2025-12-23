-- =====================================================
-- MULTI-USER CLIENT PORTAL SYSTEM
-- =====================================================
-- Creates client_users junction table for multiple users per client
-- Creates client_user_invites for team member invitations
-- Updates claim_client_invite_token to use new table and validate email
-- Migrates existing client-user relationships

-- =====================================================
-- 1. CREATE CLIENT USER ROLE ENUM
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.client_user_role AS ENUM ('primary', 'billing', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. CREATE CLIENT_USERS JUNCTION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role client_user_role NOT NULL DEFAULT 'viewer',
  invited_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON public.client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_user_id ON public.client_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_organization_id ON public.client_users(organization_id);

-- Enable RLS
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_users
CREATE POLICY "client_users_select_own"
ON public.client_users
FOR SELECT
USING (
  user_id IN (SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid())
);

CREATE POLICY "client_users_select_org"
ON public.client_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND uo.organization_id = client_users.organization_id
    AND uo.role IN ('admin', 'ops_manager', 'sales')
  )
);

CREATE POLICY "client_users_insert_primary"
ON public.client_users
FOR INSERT
WITH CHECK (
  -- Primary contacts can invite others to their client
  EXISTS (
    SELECT 1 FROM client_users cu
    JOIN users u ON cu.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND cu.client_id = client_users.client_id
    AND cu.role = 'primary'
  )
  OR
  -- Org admins can add users
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND uo.organization_id = client_users.organization_id
    AND uo.role IN ('admin', 'ops_manager', 'sales')
  )
);

CREATE POLICY "client_users_delete_primary"
ON public.client_users
FOR DELETE
USING (
  -- Primary contacts can remove others (but not themselves)
  (
    EXISTS (
      SELECT 1 FROM client_users cu
      JOIN users u ON cu.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND cu.client_id = client_users.client_id
      AND cu.role = 'primary'
    )
    AND user_id NOT IN (SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid())
  )
  OR
  -- Org admins can remove users
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND uo.organization_id = client_users.organization_id
    AND uo.role IN ('admin', 'ops_manager', 'sales')
  )
);

-- Service role access
CREATE POLICY "client_users_service_role"
ON public.client_users
FOR ALL
USING (current_setting('role') = 'service_role');

-- =====================================================
-- 3. CREATE CLIENT_USER_INVITES TABLE (for team member invites)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.client_user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  role client_user_role NOT NULL DEFAULT 'viewer',
  invited_by uuid NOT NULL REFERENCES public.users(id),
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(token)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_user_invites_client_id ON public.client_user_invites(client_id);
CREATE INDEX IF NOT EXISTS idx_client_user_invites_token ON public.client_user_invites(token);

-- Enable RLS
ALTER TABLE public.client_user_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_user_invites
CREATE POLICY "client_user_invites_select_primary"
ON public.client_user_invites
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_users cu
    JOIN users u ON cu.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND cu.client_id = client_user_invites.client_id
    AND cu.role = 'primary'
  )
);

CREATE POLICY "client_user_invites_insert_primary"
ON public.client_user_invites
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_users cu
    JOIN users u ON cu.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND cu.client_id = client_user_invites.client_id
    AND cu.role = 'primary'
  )
);

CREATE POLICY "client_user_invites_org_manage"
ON public.client_user_invites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND uo.organization_id = client_user_invites.organization_id
    AND uo.role IN ('admin', 'ops_manager', 'sales')
  )
);

CREATE POLICY "client_user_invites_service_role"
ON public.client_user_invites
FOR ALL
USING (current_setting('role') = 'service_role');

-- =====================================================
-- 4. MIGRATE EXISTING CLIENT-USER RELATIONSHIPS
-- =====================================================
INSERT INTO public.client_users (client_id, user_id, organization_id, role, created_at)
SELECT 
  c.id as client_id,
  c.user_id,
  c.organization_id,
  'primary'::client_user_role as role,
  COALESCE(c.updated_at, c.created_at) as created_at
FROM public.clients c
WHERE c.user_id IS NOT NULL
ON CONFLICT (client_id, user_id) DO NOTHING;

-- =====================================================
-- 5. UPDATE CLAIM_CLIENT_INVITE_TOKEN FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.claim_client_invite_token(
  invite_token text, 
  claiming_user_id uuid,
  claiming_email text DEFAULT NULL
)
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

  -- Validate invite exists and is usable
  IF invite_record IS NULL OR invite_record.used_at IS NOT NULL OR invite_record.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;

  -- Validate email matches if provided
  IF claiming_email IS NOT NULL AND invite_record.sent_to_email IS NOT NULL THEN
    IF LOWER(claiming_email) != LOWER(invite_record.sent_to_email) THEN
      RAISE EXCEPTION 'Email does not match invitation. This invite was sent to %', invite_record.sent_to_email;
    END IF;
  END IF;

  -- Mark invite as used
  UPDATE client_invites
  SET used_at = NOW(), used_by = claiming_user_id, updated_at = NOW()
  WHERE id = invite_record.id;

  -- Link the user to the client (legacy - keep for backwards compatibility)
  UPDATE clients
  SET user_id = claiming_user_id, updated_at = NOW()
  WHERE id = invite_record.client_id
  AND user_id IS NULL; -- Only set if not already set

  -- Insert into client_users junction table as primary
  INSERT INTO client_users (client_id, user_id, organization_id, role)
  VALUES (invite_record.client_id, claiming_user_id, invite_record.organization_id, 'primary')
  ON CONFLICT (client_id, user_id) DO UPDATE SET role = 'primary';

  -- Add user to organization with client role
  INSERT INTO user_organization_roles (user_id, organization_id, role)
  VALUES (claiming_user_id, invite_record.organization_id, 'client')
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'client';

  RETURN TRUE;
END;
$$;

-- =====================================================
-- 6. CREATE FUNCTION TO VALIDATE AND CLAIM TEAM INVITES
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_client_team_invite_token(invite_token text)
RETURNS TABLE(
  id uuid,
  client_id uuid,
  organization_id uuid,
  organization_name text,
  organization_logo text,
  company_name text,
  invited_email text,
  role client_user_role,
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
    cui.id,
    cui.client_id,
    cui.organization_id,
    o.name as organization_name,
    o.logo_url as organization_logo,
    c.company_name,
    cui.invited_email,
    cui.role,
    cui.expires_at,
    cui.used_at
  INTO invite_record
  FROM client_user_invites cui
  JOIN organizations o ON cui.organization_id = o.id
  JOIN clients c ON cui.client_id = c.id
  WHERE cui.token = invite_token;

  -- Check if invite exists
  IF invite_record IS NULL THEN
    RETURN QUERY SELECT 
      NULL::UUID, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, 
      NULL::TEXT, NULL::TEXT, NULL::client_user_role, FALSE, 'Invalid invitation link'::TEXT;
    RETURN;
  END IF;

  -- Check if already used
  IF invite_record.used_at IS NOT NULL THEN
    RETURN QUERY SELECT 
      invite_record.id, invite_record.client_id, invite_record.organization_id,
      invite_record.organization_name, invite_record.organization_logo,
      invite_record.company_name, invite_record.invited_email, invite_record.role,
      FALSE, 'This invitation has already been used'::TEXT;
    RETURN;
  END IF;

  -- Check if expired
  IF invite_record.expires_at < NOW() THEN
    RETURN QUERY SELECT 
      invite_record.id, invite_record.client_id, invite_record.organization_id,
      invite_record.organization_name, invite_record.organization_logo,
      invite_record.company_name, invite_record.invited_email, invite_record.role,
      FALSE, 'This invitation has expired'::TEXT;
    RETURN;
  END IF;

  -- Valid invite
  RETURN QUERY SELECT 
    invite_record.id, invite_record.client_id, invite_record.organization_id,
    invite_record.organization_name, invite_record.organization_logo,
    invite_record.company_name, invite_record.invited_email, invite_record.role,
    TRUE, NULL::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_client_team_invite_token(
  invite_token text, 
  claiming_user_id uuid,
  claiming_email text
)
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
  FROM client_user_invites
  WHERE token = invite_token
  FOR UPDATE;

  -- Validate
  IF invite_record IS NULL OR invite_record.used_at IS NOT NULL OR invite_record.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;

  -- Validate email matches
  IF LOWER(claiming_email) != LOWER(invite_record.invited_email) THEN
    RAISE EXCEPTION 'Email does not match invitation. This invite was sent to %', invite_record.invited_email;
  END IF;

  -- Mark as used
  UPDATE client_user_invites
  SET used_at = NOW(), used_by = claiming_user_id
  WHERE id = invite_record.id;

  -- Insert into client_users junction table
  INSERT INTO client_users (client_id, user_id, organization_id, role, invited_by)
  VALUES (invite_record.client_id, claiming_user_id, invite_record.organization_id, invite_record.role, invite_record.invited_by)
  ON CONFLICT (client_id, user_id) DO UPDATE SET role = invite_record.role;

  -- Add user to organization with client role
  INSERT INTO user_organization_roles (user_id, organization_id, role)
  VALUES (claiming_user_id, invite_record.organization_id, 'client')
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  RETURN TRUE;
END;
$$;

-- =====================================================
-- 7. HELPER FUNCTION TO CHECK CLIENT USER ROLE
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_client_user_role(p_user_id uuid, p_client_id uuid)
RETURNS client_user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM client_users
  WHERE user_id = p_user_id AND client_id = p_client_id
  LIMIT 1;
$$;

-- =====================================================
-- 8. UPDATE RLS ON CLIENTS TO USE CLIENT_USERS TABLE
-- =====================================================
-- Add policy for users in client_users to see their client
DROP POLICY IF EXISTS "clients_self_select" ON public.clients;

CREATE POLICY "clients_self_select"
ON public.clients
FOR SELECT
USING (
  id IN (
    SELECT cu.client_id FROM client_users cu
    JOIN users u ON cu.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
  OR
  user_id IN (SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid())
);