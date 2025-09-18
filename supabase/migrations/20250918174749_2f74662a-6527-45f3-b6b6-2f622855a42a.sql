-- Complete remaining security and performance fixes (without concurrent indexes)

-- 1. Add missing RLS policies for stops table
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

-- 2. Fix user_preferences RLS to ensure users can only see their own data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_preferences' AND policyname = 'Users can delete their own preferences'
  ) THEN
    CREATE POLICY "Users can delete their own preferences" 
    ON public.user_preferences 
    FOR DELETE 
    USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));
  END IF;
END $$;

-- 3. Add regular indexes for performance (not concurrent)
CREATE INDEX IF NOT EXISTS idx_pickups_organization_status ON public.pickups(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_pickups_client_date ON public.pickups(client_id, pickup_date);
CREATE INDEX IF NOT EXISTS idx_assignments_driver_date ON public.assignments(driver_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_clients_organization_active ON public.clients(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_org_roles_lookup ON public.user_organization_roles(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_client_active ON public.locations(client_id, is_active);
CREATE INDEX IF NOT EXISTS idx_client_summaries_org_year ON public.client_summaries(organization_id, year, month);
CREATE INDEX IF NOT EXISTS idx_audit_events_org_date ON public.audit_events(organization_id, created_at DESC);

-- 4. Add constraint to prevent data integrity issues (only if it doesn't exist)
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

    COMMENT ON CONSTRAINT unique_user_org_role ON public.user_organization_roles IS 'Prevents duplicate role assignments for same user in same organization';
  END IF;
END $$;

-- 5. Add performance optimization for manifest queries
CREATE INDEX IF NOT EXISTS idx_manifests_org_status_date ON public.manifests(organization_id, status, created_at DESC);

-- 6. Optimize pricing queries
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_org_active ON public.pricing_tiers(organization_id) WHERE organization_id IS NOT NULL;