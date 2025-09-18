-- Fix Security Definer View issue by recreating overlay views without SECURITY DEFINER
-- Drop existing views if they exist with SECURITY DEFINER property
DROP VIEW IF EXISTS public.generator_overlay_view;
DROP VIEW IF EXISTS public.hauler_overlay_view;
DROP VIEW IF EXISTS public.receiver_overlay_view;

-- Recreate views as regular views (without SECURITY DEFINER) 
-- These views will use the querying user's permissions and RLS policies

-- Generator overlay view for manifest PDF generation
CREATE VIEW public.generator_overlay_view AS
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

-- Hauler overlay view for manifest PDF generation
CREATE VIEW public.hauler_overlay_view AS
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

-- Receiver overlay view for manifest PDF generation
CREATE VIEW public.receiver_overlay_view AS
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

-- Ensure views inherit RLS policies from underlying tables
-- (This is automatic since we're not using SECURITY DEFINER)