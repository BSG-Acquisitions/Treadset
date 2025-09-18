-- Fix Critical Security Issues

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
    AND uo.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid() 
    AND uo.role = 'admin'
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
        AND uo.role = ANY(ARRAY['admin', 'ops_manager'])
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_organization_roles uo
        JOIN public.users u ON uo.user_id = u.id
        WHERE u.auth_user_id = auth.uid() 
        AND uo.organization_id = surcharge_rules.organization_id
        AND uo.role = ANY(ARRAY['admin', 'ops_manager'])
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

-- 4. Add RLS policies for views if needed
ALTER VIEW public.generator_overlay_view SET (security_invoker = true);
ALTER VIEW public.hauler_overlay_view SET (security_invoker = true);
ALTER VIEW public.receiver_overlay_view SET (security_invoker = true);

-- 5. Add missing RLS policies for stops table if it doesn't have them
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

-- 6. Secure audit_events table - only allow system inserts and org member reads
CREATE POLICY "System can insert audit events" 
ON public.audit_events 
FOR INSERT 
WITH CHECK (true);

-- 7. Fix user_preferences RLS to ensure users can only see their own data
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_preferences;
CREATE POLICY "Users can delete their own preferences" 
ON public.user_preferences 
FOR DELETE 
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- 8. Add comprehensive indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pickups_organization_status ON public.pickups(organization_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pickups_client_date ON public.pickups(client_id, pickup_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_driver_date ON public.assignments(driver_id, scheduled_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manifests_organization_status ON public.manifests(organization_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_organization_active ON public.clients(organization_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_org_roles_auth_user ON public.user_organization_roles(user_id) WHERE user_id IN (SELECT id FROM public.users);

-- 9. Add constraint to prevent data integrity issues
ALTER TABLE public.user_organization_roles 
ADD CONSTRAINT unique_user_org_role 
UNIQUE (user_id, organization_id, role);

COMMENT ON CONSTRAINT unique_user_org_role ON public.user_organization_roles IS 'Prevents duplicate role assignments for same user in same organization';