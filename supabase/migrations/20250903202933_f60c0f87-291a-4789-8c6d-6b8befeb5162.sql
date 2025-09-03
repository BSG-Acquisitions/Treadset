-- =============================================
-- RLS performance fixes and duplicate index cleanup
-- =============================================

-- ORGANIZATIONS: keep a single SELECT policy, move manage policy to I/U/D only, and wrap auth.uid()
ALTER POLICY "Allow viewing organizations when authenticated or auth disabled"
ON public.organizations
USING (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL));

DROP POLICY IF EXISTS "Allow managing organizations when authenticated or auth disable" ON public.organizations;

CREATE POLICY "Allow inserting organizations when authenticated or auth disabled"
ON public.organizations
FOR INSERT
USING (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL))
WITH CHECK (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Allow updating organizations when authenticated or auth disabled"
ON public.organizations
FOR UPDATE
USING (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL))
WITH CHECK (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL));

CREATE POLICY "Allow deleting organizations when authenticated or auth disabled"
ON public.organizations
FOR DELETE
USING (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL));

-- USERS
ALTER POLICY "Allow user operations when authenticated or auth disabled" 
ON public.users
USING (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL))
WITH CHECK (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL));

-- USER ORGANIZATION ROLES
ALTER POLICY "Allow access to user organization roles"
ON public.user_organization_roles
USING (((select auth.uid()) IS NULL) OR (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = (select auth.uid())
  )
));

-- ORG-SCOPED TABLES: same policy name across
ALTER POLICY "Users can access data in their organizations" ON public.clients
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

ALTER POLICY "Users can access data in their organizations" ON public.locations
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

ALTER POLICY "Users can access data in their organizations" ON public.pickups
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

ALTER POLICY "Users can access data in their organizations" ON public.vehicles
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

ALTER POLICY "Users can access data in their organizations" ON public.assignments
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

ALTER POLICY "Users can access data in their organizations" ON public.invoices
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

ALTER POLICY "Users can access data in their organizations" ON public.payments
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

ALTER POLICY "Users can access data in their organizations" ON public.pricing_tiers
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

ALTER POLICY "Users can access data in their organizations" ON public.client_summaries
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

ALTER POLICY "Users can access data in their organizations" ON public.price_matrix
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

ALTER POLICY "Users can access data in their organizations" ON public.surcharge_rules
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

ALTER POLICY "Users can access data in their organizations" ON public.client_pricing_overrides
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

ALTER POLICY "Users can access data in their organizations" ON public.location_pricing_overrides
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

ALTER POLICY "Users can access data in their organizations" ON public.price_versions
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

-- MANIFESTS (custom policy name)
ALTER POLICY "Users can access manifests in their organizations" ON public.manifests
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

-- CLIENT WORKFLOWS (custom policy name)
ALTER POLICY "Users can access workflow data in their organizations" ON public.client_workflows
USING (((select auth.uid()) IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = (select auth.uid())
)));

-- USER PREFERENCES
ALTER POLICY "Users can view their own preferences" ON public.user_preferences
USING (((select auth.uid()) = user_id));

ALTER POLICY "Users can create their own preferences" ON public.user_preferences
WITH CHECK (((select auth.uid()) = user_id));

ALTER POLICY "Users can update their own preferences" ON public.user_preferences
USING (((select auth.uid()) = user_id));

-- DROP DUPLICATE INDEXES (keep constraint-backed *_key indexes)
DROP INDEX IF EXISTS public.uidx_invoices_number;
DROP INDEX IF EXISTS public.idx_locations_active;
DROP INDEX IF EXISTS public.idx_manifests_org_number;
DROP INDEX IF EXISTS public.uidx_organizations_slug;
DROP INDEX IF EXISTS public.idx_pickups_date;
DROP INDEX IF EXISTS public.uidx_user_preferences_user;