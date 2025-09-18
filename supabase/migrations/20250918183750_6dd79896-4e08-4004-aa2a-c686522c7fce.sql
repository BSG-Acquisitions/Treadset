-- Fix Remaining Multiple Permissive Policies - Part 1
-- Consolidate duplicate policies for better performance

-- 1. FIX GENERATORS TABLE - Remove duplicate policy
DROP POLICY IF EXISTS "read generators" ON public.generators;
-- Keep only "Allow authenticated users to read generators"

-- 2. FIX MANIFESTS TABLE - Consolidate policies like we did for assignments
DROP POLICY IF EXISTS "Admins and ops can manage all manifests" ON public.manifests;
DROP POLICY IF EXISTS "Drivers can manage their manifests" ON public.manifests;

-- Create single comprehensive policy for SELECT
CREATE POLICY "Users can view manifests" ON public.manifests
FOR SELECT USING (
  -- Admins/ops can view all manifests in their org
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = manifests.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
  OR
  -- Drivers can view their own manifests
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = manifests.organization_id) 
   AND (uo.role = 'driver'::app_role) AND (u.id = manifests.driver_id)))
);

-- Create single comprehensive policy for UPDATE  
CREATE POLICY "Users can update manifests" ON public.manifests
FOR UPDATE USING (
  -- Admins/ops can update all manifests in their org
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = manifests.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
  OR
  -- Drivers can update their own manifests
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = manifests.organization_id) 
   AND (uo.role = 'driver'::app_role) AND (u.id = manifests.driver_id)))
) WITH CHECK (
  -- Same conditions for WITH CHECK
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = manifests.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
  OR
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = manifests.organization_id) 
   AND (uo.role = 'driver'::app_role) AND (u.id = manifests.driver_id)))
);

-- Create policies for INSERT and DELETE (admin/ops only)
CREATE POLICY "Admins can manage manifests" ON public.manifests
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = manifests.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
);

CREATE POLICY "Admins can delete manifests" ON public.manifests
FOR DELETE USING (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.organization_id = manifests.organization_id) 
   AND (uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role]))))
);

-- 3. FIX ORGANIZATION_SETTINGS TABLE - Consolidate read policies
DROP POLICY IF EXISTS "Admins can manage organization settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Org members can read organization settings" ON public.organization_settings;

-- Create single comprehensive policy for SELECT (combines both read permissions)
CREATE POLICY "Users can view organization settings" ON public.organization_settings
FOR SELECT USING (
  EXISTS (SELECT 1
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
  WHERE (u.auth_user_id = (SELECT auth.uid())))
);

-- Separate policy for admin management (INSERT, UPDATE, DELETE)
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

-- 4. FIX ORGANIZATIONS TABLE - Consolidate view policies
DROP POLICY IF EXISTS "Admins can manage organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;

-- Create single comprehensive policy for SELECT (combines user + admin views)
CREATE POLICY "Users can view organizations" ON public.organizations
FOR SELECT USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE (u.auth_user_id = (SELECT auth.uid()))))
);

-- Separate policy for admin management (INSERT, UPDATE, DELETE)  
CREATE POLICY "Admins can manage organizations" ON public.organizations
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.role = 'admin'::app_role))))
) WITH CHECK (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.role = 'admin'::app_role))))
);