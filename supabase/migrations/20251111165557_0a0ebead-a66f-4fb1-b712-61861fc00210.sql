-- Fix 1: Set search_path for the function
CREATE OR REPLACE FUNCTION public.update_client_pickup_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';

-- Fix 2: Revoke SELECT permissions from materialized views for anon and authenticated roles
REVOKE SELECT ON public.mv_monthly_entity_rollup FROM anon;
REVOKE SELECT ON public.mv_monthly_entity_rollup FROM authenticated;
REVOKE SELECT ON public.mv_processing_summary FROM anon;
REVOKE SELECT ON public.mv_processing_summary FROM authenticated;
REVOKE SELECT ON public.mv_revenue_summary FROM anon;
REVOKE SELECT ON public.mv_revenue_summary FROM authenticated;