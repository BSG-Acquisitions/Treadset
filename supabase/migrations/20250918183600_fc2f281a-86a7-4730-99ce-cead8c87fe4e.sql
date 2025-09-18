-- Final Performance Optimization - Part 3
-- Complete remaining auth.uid() fixes and resolve multiple permissive policies

-- 16. CLIENT_PRICING_OVERRIDES TABLE
DROP POLICY IF EXISTS "Org members can access client pricing overrides" ON public.client_pricing_overrides;
CREATE POLICY "Org members can access client pricing overrides" ON public.client_pricing_overrides
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (organization_id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE (u.auth_user_id = (SELECT auth.uid()))))
);

-- 17. PRICE_VERSIONS TABLE
DROP POLICY IF EXISTS "Org members can access price versions" ON public.price_versions;
CREATE POLICY "Org members can access price versions" ON public.price_versions
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (organization_id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE (u.auth_user_id = (SELECT auth.uid()))))
);

-- 18. NOTIFICATIONS TABLE (2 policies)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- 19. GENERATORS TABLE
DROP POLICY IF EXISTS "Allow authenticated users to read generators" ON public.generators;
CREATE POLICY "Allow authenticated users to read generators" ON public.generators
FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- 20. DROPOFF_CUSTOMERS TABLE
DROP POLICY IF EXISTS "Org members can manage dropoff customers" ON public.dropoff_customers;
CREATE POLICY "Org members can manage dropoff customers" ON public.dropoff_customers
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (organization_id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE (u.auth_user_id = (SELECT auth.uid()))))
);

-- 21. DROPOFFS TABLE
DROP POLICY IF EXISTS "Org members can manage dropoffs" ON public.dropoffs;
CREATE POLICY "Org members can manage dropoffs" ON public.dropoffs
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (organization_id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE (u.auth_user_id = (SELECT auth.uid()))))
);

-- 22. ORGANIZATION_SETTINGS TABLE (2 policies)
DROP POLICY IF EXISTS "Org members can read organization settings" ON public.organization_settings;
CREATE POLICY "Org members can read organization settings" ON public.organization_settings
FOR SELECT USING (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE (u.auth_user_id = (SELECT auth.uid())))
);

DROP POLICY IF EXISTS "Admins can manage organization settings" ON public.organization_settings;
CREATE POLICY "Admins can manage organization settings" ON public.organization_settings
FOR ALL USING (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.role = 'admin'::app_role)))
) WITH CHECK (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.role = 'admin'::app_role)))
);

-- 23. STOPS TABLE
DROP POLICY IF EXISTS "Authenticated users can manage stops" ON public.stops;
CREATE POLICY "Authenticated users can manage stops" ON public.stops
FOR ALL USING ((SELECT auth.uid()) IS NOT NULL) 
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- 24. SURCHARGE_RULES TABLE (2 policies)
DROP POLICY IF EXISTS "Org members can read surcharge rules" ON public.surcharge_rules;
CREATE POLICY "Org members can read surcharge rules" ON public.surcharge_rules
FOR SELECT USING (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = surcharge_rules.organization_id)))
);

DROP POLICY IF EXISTS "Admins can manage surcharge rules" ON public.surcharge_rules;
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

-- 25. FIX ASSIGNMENTS TABLE - Consolidate multiple permissive policies
-- Drop existing policies and create consolidated ones
DROP POLICY IF EXISTS "Admins and ops can manage assignments in their org" ON public.assignments;
DROP POLICY IF EXISTS "Drivers can view their assigned routes" ON public.assignments;
DROP POLICY IF EXISTS "Drivers can update their assignments" ON public.assignments;

-- Create single comprehensive policy for SELECT (consolidates admin/ops + driver views)
CREATE POLICY "Users can view assignments" ON public.assignments
FOR SELECT USING (
  -- Admins/ops can view all assignments in their org
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = assignments.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
  OR
  -- Drivers can view their own assignments
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = assignments.organization_id) 
   AND (uo.role = 'driver'::app_role) AND (u.id = assignments.driver_id)))
);

-- Create single comprehensive policy for UPDATE (consolidates admin/ops + driver updates)
CREATE POLICY "Users can update assignments" ON public.assignments
FOR UPDATE USING (
  -- Admins/ops can update all assignments in their org
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = assignments.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
  OR
  -- Drivers can update their own assignments
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = assignments.organization_id) 
   AND (uo.role = 'driver'::app_role) AND (u.id = assignments.driver_id)))
) WITH CHECK (
  -- Same conditions for WITH CHECK
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = assignments.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
  OR
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = assignments.organization_id) 
   AND (uo.role = 'driver'::app_role) AND (u.id = assignments.driver_id)))
);

-- Create policy for INSERT and DELETE (admin/ops only)
CREATE POLICY "Admins can manage assignments" ON public.assignments
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = assignments.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
);

CREATE POLICY "Admins can delete assignments" ON public.assignments
FOR DELETE USING (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = assignments.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
);