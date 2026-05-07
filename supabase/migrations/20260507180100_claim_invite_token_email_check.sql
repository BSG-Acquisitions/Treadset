-- Onboarding hardening — CRITICAL #3 (2026-05-06 audit)
--
-- Problem: claim_invite_token(invite_token TEXT, claiming_user_id UUID) takes
-- only the token + an arbitrary user id. A user authenticated as someone OTHER
-- than the invite recipient can call the RPC with their own user id and claim
-- the role into their account. Frontend (Invite.tsx) does not pass the email
-- and there is no server-side cross-check. This is a token-bypass: anyone who
-- intercepts an invite link can claim it as themselves.
--
-- Fix: add a `claiming_email` parameter and validate
--   LOWER(claiming_email) = LOWER(invite_record.email)
-- before granting the role. NULL invite emails (qr_code invites) skip the
-- check, preserving the existing security model for that flow.
--
-- Default value of NULL keeps the function callable with the old 2-arg
-- signature so deploy ordering doesn't break with a "function not found"
-- error. Old callers will instead hit the new "Invitation email mismatch"
-- runtime error — controlled failure, not silent bypass.
--
-- Reverses: redefine the function with the original 2-arg signature from
-- supabase/migrations/20251216184101_*.sql.

DROP FUNCTION IF EXISTS public.claim_invite_token(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.claim_invite_token(
  invite_token TEXT,
  claiming_user_id UUID,
  claiming_email TEXT DEFAULT NULL
)
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

  -- Validate exists / not used / not expired
  IF invite_record IS NULL OR invite_record.used_at IS NOT NULL OR invite_record.expires_at < NOW() THEN
    RETURN FALSE;
  END IF;

  -- Validate email match (skipped only for qr_code invites where email IS NULL).
  -- Without this check, anyone holding the invite token could claim it as
  -- their own user. See 2026-05-06 audit, Onboarding CRITICAL #3.
  IF invite_record.email IS NOT NULL THEN
    IF claiming_email IS NULL OR LOWER(claiming_email) <> LOWER(invite_record.email) THEN
      RAISE EXCEPTION 'Invitation email mismatch';
    END IF;
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
