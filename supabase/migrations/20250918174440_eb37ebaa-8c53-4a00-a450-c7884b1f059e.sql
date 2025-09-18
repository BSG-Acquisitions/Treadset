-- Fix Critical Security Issues (Corrected)

-- 1. Fix RLS policies for organization_settings (currently publicly readable)
DROP POLICY IF EXISTS "Allow all operations on organization_settings" ON public.organization_settings;

-- Add proper RLS policies for organization_settings
CREATE POLICY "Org members can read organization settings" 
ON public.organization_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage organization settings" 
ON public.organization_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid() 
    AND uo.role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid() 
    AND uo.role = 'admin'::app_role
  )
);

-- 2. Fix RLS policies for surcharge_rules if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'surcharge_rules' AND table_schema = 'public') THEN
    -- Enable RLS
    ALTER TABLE public.surcharge_rules ENABLE ROW LEVEL SECURITY;
    
    -- Add policies
    CREATE POLICY "Org members can read surcharge rules" 
    ON public.surcharge_rules 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM public.user_organization_roles uo
        JOIN public.users u ON uo.user_id = u.id
        WHERE u.auth_user_id = auth.uid()
        AND uo.organization_id = surcharge_rules.organization_id
      )
    );

    CREATE POLICY "Admins can manage surcharge rules" 
    ON public.surcharge_rules 
    FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM public.user_organization_roles uo
        JOIN public.users u ON uo.user_id = u.id
        WHERE u.auth_user_id = auth.uid() 
        AND uo.organization_id = surcharge_rules.organization_id
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role])
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_organization_roles uo
        JOIN public.users u ON uo.user_id = u.id
        WHERE u.auth_user_id = auth.uid() 
        AND uo.organization_id = surcharge_rules.organization_id
        AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role])
      )
    );
  END IF;
END $$;

-- 3. Fix Security Definer Views - Drop and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.generator_overlay_view;
DROP VIEW IF EXISTS public.hauler_overlay_view;
DROP VIEW IF EXISTS public.receiver_overlay_view;

-- Recreate views without SECURITY DEFINER (they will use SECURITY INVOKER by default)
CREATE VIEW public.generator_overlay_view AS
SELECT 
  id as generator_id,
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

CREATE VIEW public.hauler_overlay_view AS
SELECT 
  id as hauler_id,
  hauler_name,
  hauler_mailing_address,
  hauler_city,
  hauler_state,
  hauler_zip,
  hauler_phone,
  hauler_mi_reg
FROM public.haulers
WHERE is_active = true;

CREATE VIEW public.receiver_overlay_view AS
SELECT 
  id as receiver_id,
  receiver_name,
  receiver_mailing_address,
  receiver_city,
  receiver_state,
  receiver_zip,
  receiver_phone
FROM public.receivers
WHERE is_active = true;