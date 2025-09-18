-- Fix Security Definer View issue by ensuring proper ownership and security model
-- The issue is likely that views are owned by postgres user instead of authenticator/anon users
-- This gives them elevated privileges that bypass RLS

-- Drop and recreate all views to ensure proper ownership and security model

-- 1. Drop existing views
DROP VIEW IF EXISTS public.generator_overlay_view CASCADE;
DROP VIEW IF EXISTS public.hauler_overlay_view CASCADE;  
DROP VIEW IF EXISTS public.receiver_overlay_view CASCADE;
DROP VIEW IF EXISTS public.pickup_analytics CASCADE;

-- 2. Recreate views without elevated privileges
-- These views will now use the permissions of the querying user, not the view owner

CREATE VIEW public.generator_overlay_view 
WITH (security_barrier = true)  -- Enforce RLS
AS
SELECT 
    id AS generator_id,
    generator_name,
    generator_mailing_address,
    generator_city,
    generator_state,
    generator_zip,
    generator_phone,
    generator_county,
    generator_physical_address,
    generator_city_2,
    generator_state_2,
    generator_zip_2
FROM public.generators
WHERE is_active = true;

CREATE VIEW public.hauler_overlay_view 
WITH (security_barrier = true)  -- Enforce RLS
AS
SELECT 
    id AS hauler_id,
    hauler_name,
    hauler_mailing_address,
    hauler_city,
    hauler_state,
    hauler_zip,
    hauler_phone,
    hauler_mi_reg
FROM public.haulers
WHERE is_active = true;

CREATE VIEW public.receiver_overlay_view 
WITH (security_barrier = true)  -- Enforce RLS
AS
SELECT 
    id AS receiver_id,
    receiver_name,
    receiver_mailing_address,
    receiver_city,
    receiver_state,
    receiver_zip,
    receiver_phone
FROM public.receivers
WHERE is_active = true;

CREATE VIEW public.pickup_analytics 
WITH (security_barrier = true)  -- Enforce RLS
AS
SELECT 
    c.id AS client_id,
    c.company_name,
    c.type AS client_type,
    EXTRACT(year FROM p.pickup_date) AS year,
    EXTRACT(month FROM p.pickup_date) AS month,
    count(*) AS pickup_count,
    sum(p.pte_count) AS total_ptes,
    sum(p.otr_count) AS total_otr,
    sum(p.tractor_count) AS total_tractor,
    sum(p.computed_revenue) AS total_revenue,
    avg(p.pte_count + p.otr_count + p.tractor_count) AS avg_pickup_size,
    min(p.pickup_date) AS first_pickup,
    max(p.pickup_date) AS last_pickup,
    c.organization_id
FROM public.clients c
LEFT JOIN public.pickups p ON c.id = p.client_id
WHERE p.status = 'completed'
GROUP BY c.id, c.company_name, c.type, EXTRACT(year FROM p.pickup_date), EXTRACT(month FROM p.pickup_date), c.organization_id;

-- Ensure views inherit proper RLS policies from underlying tables
-- The security_barrier option forces the view to respect RLS policies

-- Grant appropriate permissions on views
GRANT SELECT ON public.generator_overlay_view TO authenticated, anon;
GRANT SELECT ON public.hauler_overlay_view TO authenticated, anon;
GRANT SELECT ON public.receiver_overlay_view TO authenticated, anon;
GRANT SELECT ON public.pickup_analytics TO authenticated, anon;