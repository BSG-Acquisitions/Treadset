-- Comprehensive Performance Optimization for RLS Policies
-- Fix all auth.uid() calls by wrapping them in (select auth.uid()) for better performance
-- This prevents re-evaluation of auth functions for each row

-- 1. ORGANIZATIONS TABLE
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
CREATE POLICY "Users can view organizations they belong to" ON public.organizations
FOR SELECT USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE (u.auth_user_id = (SELECT auth.uid()))))
);

DROP POLICY IF EXISTS "Admins can manage organizations they belong to" ON public.organizations;
CREATE POLICY "Admins can manage organizations they belong to" ON public.organizations
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE ((u.auth_user_id = (SELECT auth.uid())) AND (uo.role = 'admin'::app_role))))
);

-- 2. LOCATIONS TABLE  
DROP POLICY IF EXISTS "Org members can access locations" ON public.locations;
CREATE POLICY "Org members can access locations" ON public.locations
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (organization_id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE (u.auth_user_id = (SELECT auth.uid()))))
);

-- 3. VEHICLES TABLE
DROP POLICY IF EXISTS "Org members can access vehicles" ON public.vehicles;
CREATE POLICY "Org members can access vehicles" ON public.vehicles
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (organization_id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE (u.auth_user_id = (SELECT auth.uid()))))
);

-- 4. PRICING_TIERS TABLE
DROP POLICY IF EXISTS "Org members can access pricing tiers" ON public.pricing_tiers;
CREATE POLICY "Org members can access pricing tiers" ON public.pricing_tiers
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (organization_id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE (u.auth_user_id = (SELECT auth.uid()))))
);

-- 5. PRICE_MATRIX TABLE
DROP POLICY IF EXISTS "Org members can access price matrix" ON public.price_matrix;
CREATE POLICY "Org members can access price matrix" ON public.price_matrix
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (organization_id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE (u.auth_user_id = (SELECT auth.uid()))))
);

-- 6. CLIENT_SUMMARIES TABLE
DROP POLICY IF EXISTS "Org members can access client summaries" ON public.client_summaries;
CREATE POLICY "Org members can access client summaries" ON public.client_summaries
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (organization_id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE (u.auth_user_id = (SELECT auth.uid()))))
);

-- 7. USER_PREFERENCES TABLE
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.user_preferences;
CREATE POLICY "Users can delete their own preferences" ON public.user_preferences
FOR DELETE USING (
  user_id IN (SELECT users.id FROM users WHERE users.auth_user_id = (SELECT auth.uid()))
);

-- 8. INVOICES TABLE
DROP POLICY IF EXISTS "Org members can access invoices" ON public.invoices;
CREATE POLICY "Org members can access invoices" ON public.invoices
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (organization_id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE (u.auth_user_id = (SELECT auth.uid()))))
);

-- 9. PAYMENTS TABLE
DROP POLICY IF EXISTS "Org members can access payments" ON public.payments;
CREATE POLICY "Org members can access payments" ON public.payments
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (organization_id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE (u.auth_user_id = (SELECT auth.uid()))))
);

-- 10. AUDIT_EVENTS TABLE
DROP POLICY IF EXISTS "Org members can view audit events" ON public.audit_events;
CREATE POLICY "Org members can view audit events" ON public.audit_events
FOR SELECT USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (organization_id IN (SELECT uo.organization_id
   FROM (user_organization_roles uo JOIN users u ON ((uo.user_id = u.id)))
   WHERE (u.auth_user_id = (SELECT auth.uid()))))
);