-- Fix Remaining Multiple Permissive Policies - Part 2 & Remove Duplicate Indexes
-- Complete policy consolidation and clean up duplicate indexes

-- 5. FIX PICKUPS TABLE - Consolidate 3 policies into unified ones  
DROP POLICY IF EXISTS "Admin and ops manage all pickups" ON public.pickups;
DROP POLICY IF EXISTS "Clients can view their pickups" ON public.pickups;
DROP POLICY IF EXISTS "Drivers can view assigned pickups" ON public.pickups;

-- Create single comprehensive policy for SELECT (combines all 3 views)
CREATE POLICY "Users can view pickups" ON public.pickups
FOR SELECT USING (
  -- Admin/ops can view all pickups in their org
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = pickups.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
  OR
  -- Clients can view their own pickups
  EXISTS (SELECT 1
   FROM ((user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
     JOIN clients c ON ((c.id = pickups.client_id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = pickups.organization_id) 
   AND (uo.role = 'client'::app_role) AND (u.email = c.email)))
  OR
  -- Drivers can view assigned pickups
  EXISTS (SELECT 1
   FROM (manifests m JOIN users u ON ((u.id = m.driver_id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (m.pickup_id = pickups.id) 
   AND (m.organization_id = pickups.organization_id)))
);

-- Create policy for admin/ops management (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage pickups" ON public.pickups
FOR ALL USING (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = pickups.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
) WITH CHECK (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = pickups.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
);

-- 6. FIX SURCHARGE_RULES TABLE - Consolidate read policies
DROP POLICY IF EXISTS "Admins can manage surcharge rules" ON public.surcharge_rules;
DROP POLICY IF EXISTS "Org members can read surcharge rules" ON public.surcharge_rules;

-- Create single policy for SELECT (combines both read permissions)
CREATE POLICY "Users can view surcharge rules" ON public.surcharge_rules
FOR SELECT USING (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = surcharge_rules.organization_id)))
);

-- Separate policy for admin management (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage surcharge rules" ON public.surcharge_rules
FOR ALL USING (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = surcharge_rules.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role]))))
) WITH CHECK (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = surcharge_rules.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role]))))
);

-- NOW REMOVE ALL DUPLICATE INDEXES FOR BETTER PERFORMANCE
-- Keep the newer/more specific ones, drop the generic duplicates

-- Drop duplicate organization indexes (keep the ones with clear naming)
DROP INDEX IF EXISTS idx_assignments_org;
DROP INDEX IF EXISTS idx_client_summaries_org;
DROP INDEX IF EXISTS idx_client_workflows_org;
DROP INDEX IF EXISTS idx_clients_org;
DROP INDEX IF EXISTS idx_invoices_org;
DROP INDEX IF EXISTS idx_locations_org;
DROP INDEX IF EXISTS idx_manifests_org;
DROP INDEX IF EXISTS idx_notifications_org_id;
DROP INDEX IF EXISTS idx_payments_org;
DROP INDEX IF EXISTS idx_pickups_org;
DROP INDEX IF EXISTS idx_price_matrix_org;
DROP INDEX IF EXISTS idx_pricing_tiers_org;
DROP INDEX IF EXISTS idx_user_org_roles_org;
DROP INDEX IF EXISTS idx_user_org_roles_user;
DROP INDEX IF EXISTS idx_vehicles_org;

-- Drop duplicate composite indexes (keep the more specific ones)
DROP INDEX IF EXISTS idx_manifests_status;
DROP INDEX IF EXISTS idx_pickups_organization_status;

-- Drop remaining duplicates
DROP INDEX IF EXISTS idx_user_org_roles_org_id;
DROP INDEX IF EXISTS idx_user_org_roles_user_id;