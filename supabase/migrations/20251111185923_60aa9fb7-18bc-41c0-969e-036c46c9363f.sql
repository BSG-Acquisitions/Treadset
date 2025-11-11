-- Security Hardening Migration: Storage Buckets + Rate Limiting
-- Date: 2025-11-11
-- Purpose: Secure storage buckets and implement rate limiting infrastructure

-- 1. Update storage buckets to private
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('manifests', 'templates');

-- 2. Create RLS policies for manifests bucket
CREATE POLICY "Organization users can view their manifests"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'manifests' AND
  EXISTS (
    SELECT 1 FROM user_organization_roles uor
    JOIN users u ON uor.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
    AND uor.organization_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Organization users can upload manifests"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'manifests' AND
  EXISTS (
    SELECT 1 FROM user_organization_roles uor
    JOIN users u ON uor.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
    AND uor.organization_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Service role can manage manifests"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'manifests');

-- 3. Create RLS policies for templates bucket
CREATE POLICY "Organization users can view templates"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'templates' AND
  EXISTS (
    SELECT 1 FROM user_organization_roles uor
    JOIN users u ON uor.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Service role can manage templates"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'templates');

-- 4. Create rate_limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limits policies
CREATE POLICY "Users can view their own rate limits"
ON public.rate_limits FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits FOR ALL
TO service_role
USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON public.rate_limits(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits(reset_at);

-- 5. Create cleanup function for expired rate limits
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE reset_at < now() - INTERVAL '1 hour';
END;
$$;