-- Continue Performance Optimization - Part 2
-- Fix remaining auth.uid() calls and consolidate duplicate policies

-- 11. PICKUPS TABLE (3 policies)
DROP POLICY IF EXISTS "Clients can view their pickups" ON public.pickups;
CREATE POLICY "Clients can view their pickups" ON public.pickups
FOR SELECT USING (
  EXISTS (SELECT 1
   FROM ((user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
     JOIN clients c ON ((c.id = pickups.client_id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = pickups.organization_id) 
   AND (uo.role = 'client'::app_role) AND (u.email = c.email)))
);

DROP POLICY IF EXISTS "Admin and ops manage all pickups" ON public.pickups;
CREATE POLICY "Admin and ops manage all pickups" ON public.pickups
FOR ALL USING (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = pickups.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
);

DROP POLICY IF EXISTS "Drivers can view assigned pickups" ON public.pickups;  
CREATE POLICY "Drivers can view assigned pickups" ON public.pickups
FOR SELECT USING (
  EXISTS (SELECT 1
   FROM (manifests m JOIN users u ON ((u.id = m.driver_id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (m.pickup_id = pickups.id) 
   AND (m.organization_id = pickups.organization_id)))
);

-- 12. MANIFESTS TABLE (2 policies)
DROP POLICY IF EXISTS "Admins and ops can manage all manifests" ON public.manifests;
CREATE POLICY "Admins and ops can manage all manifests" ON public.manifests
FOR ALL USING (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = manifests.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
);

DROP POLICY IF EXISTS "Drivers can manage their manifests" ON public.manifests;
CREATE POLICY "Drivers can manage their manifests" ON public.manifests
FOR ALL USING (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = manifests.organization_id) 
   AND (uo.role = 'driver'::app_role) AND (u.id = manifests.driver_id)))
);

-- 13. USER_ORGANIZATION_ROLES TABLE
DROP POLICY IF EXISTS "Allow authenticated access to user organization roles" ON public.user_organization_roles;
CREATE POLICY "Allow authenticated access to user organization roles" ON public.user_organization_roles
FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = (SELECT auth.uid()))
);

-- 14. LOCATION_PRICING_OVERRIDES TABLE
DROP POLICY IF EXISTS "Org members can access location pricing overrides" ON public.location_pricing_overrides;
CREATE POLICY "Org members can access location pricing overrides" ON public.location_pricing_overrides
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (organization_id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE (u.auth_user_id = (SELECT auth.uid()))))
);

-- 15. CLIENTS TABLE (4 policies)
DROP POLICY IF EXISTS "Org members can read clients" ON public.clients;
CREATE POLICY "Org members can read clients" ON public.clients
FOR SELECT USING (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = clients.organization_id)))
);

DROP POLICY IF EXISTS "Admins, ops, sales can insert clients" ON public.clients;
CREATE POLICY "Admins, ops, sales can insert clients" ON public.clients
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = clients.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'sales'::app_role]))))
);

DROP POLICY IF EXISTS "Admins, ops, sales can update clients" ON public.clients;
CREATE POLICY "Admins, ops, sales can update clients" ON public.clients
FOR UPDATE USING (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = clients.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'sales'::app_role]))))
) WITH CHECK (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = clients.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'sales'::app_role]))))
);

DROP POLICY IF EXISTS "Admins, ops, sales can delete clients" ON public.clients;
CREATE POLICY "Admins, ops, sales can delete clients" ON public.clients
FOR DELETE USING (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = clients.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'sales'::app_role]))))
);