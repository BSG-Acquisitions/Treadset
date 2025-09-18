-- Fix Critical Security Issues (Fixed Type Casting)

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

-- 2. Fix Security Definer Views - Drop and recreate without SECURITY DEFINER
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

-- 3. Add missing RLS policies for stops table if it doesn't have them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stops' AND schemaname = 'public'
  ) THEN
    ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Authenticated users can manage stops" 
    ON public.stops 
    FOR ALL 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 4. Fix user_preferences RLS to ensure users can only see their own data
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_preferences;
CREATE POLICY "Users can delete their own preferences" 
ON public.user_preferences 
FOR DELETE 
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- 5. Add comprehensive indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pickups_organization_status ON public.pickups(organization_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pickups_client_date ON public.pickups(client_id, pickup_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_driver_date ON public.assignments(driver_id, scheduled_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_organization_active ON public.clients(organization_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_org_roles_lookup ON public.user_organization_roles(user_id, organization_id);

-- 6. Add constraint to prevent data integrity issues
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_user_org_role' 
    AND table_name = 'user_organization_roles'
  ) THEN
    ALTER TABLE public.user_organization_roles 
    ADD CONSTRAINT unique_user_org_role 
    UNIQUE (user_id, organization_id, role);
  END IF;
END $$;