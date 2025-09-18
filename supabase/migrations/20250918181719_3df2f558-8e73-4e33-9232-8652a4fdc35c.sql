-- Fix Critical Security Vulnerability in surcharge_rules table
-- Issue: Policy allows unauthenticated access to sensitive pricing data

-- Drop the vulnerable policy that allows NULL auth.uid() (unauthenticated) access
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.surcharge_rules;

-- The existing policies are secure:
-- 1. "Admins can manage surcharge rules" - Only admin/ops_manager can modify
-- 2. "Org members can read surcharge rules" - Only authenticated org members can read

-- Add a comment for security documentation
COMMENT ON TABLE public.surcharge_rules IS 'Contains sensitive business pricing rules. Access restricted to authenticated organization members only via RLS policies.';