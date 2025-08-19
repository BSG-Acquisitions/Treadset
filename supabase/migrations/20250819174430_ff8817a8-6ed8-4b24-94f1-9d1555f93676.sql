-- Fix linter ERROR 1: Ensure the analytics view runs with caller privileges
ALTER VIEW public.pickup_analytics SET (security_invoker = true);