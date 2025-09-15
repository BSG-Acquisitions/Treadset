-- Fix critical RLS security issues - restrict access to organization members only

-- 1. Fix organizations table - currently allows any authenticated user to access all orgs
DROP POLICY IF EXISTS "Allow managing organizations when authenticated or auth disable" ON public.organizations;
DROP POLICY IF EXISTS "Allow deleting organizations when authenticated or auth disable" ON public.organizations;
DROP POLICY IF EXISTS "Allow inserting organizations when authenticated or auth disabl" ON public.organizations;
DROP POLICY IF EXISTS "Allow updating organizations when authenticated or auth disable" ON public.organizations;  
DROP POLICY IF EXISTS "Allow viewing organizations when authenticated or auth disabled" ON public.organizations;

-- Create secure organization policies - only allow access to orgs user belongs to
CREATE POLICY "Users can view organizations they belong to" ON public.organizations
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  id IN (
    SELECT uo.organization_id 
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage organizations they belong to" ON public.organizations
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  id IN (
    SELECT uo.organization_id 
    FROM user_organization_roles uo  
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid() AND uo.role = 'admin'
  )
);

-- 2. Fix assignments table - remove unauthenticated access
DROP POLICY IF EXISTS "Admins and ops can manage all assignments" ON public.assignments;

CREATE POLICY "Admins and ops can manage assignments in their org" ON public.assignments
FOR ALL  
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id  
    WHERE u.auth_user_id = auth.uid() 
    AND uo.organization_id = assignments.organization_id
    AND uo.role IN ('admin', 'ops_manager', 'dispatcher')
  )
);

-- 3. Fix locations table - remove unauthenticated access  
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.locations;

CREATE POLICY "Org members can access locations" ON public.locations
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 4. Fix vehicles table - remove unauthenticated access
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.vehicles;

CREATE POLICY "Org members can access vehicles" ON public.vehicles  
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id  
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 5. Fix pricing_tiers table
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.pricing_tiers;

CREATE POLICY "Org members can access pricing tiers" ON public.pricing_tiers
FOR ALL
USING (
  auth.uid() IS NOT NULL AND  
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 6. Fix price_matrix table  
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.price_matrix;

CREATE POLICY "Org members can access price matrix" ON public.price_matrix
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  organization_id IN (
    SELECT uo.organization_id  
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 7. Fix client_summaries table
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.client_summaries;

CREATE POLICY "Org members can access client summaries" ON public.client_summaries
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo  
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 8. Fix invoices table
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.invoices;

CREATE POLICY "Org members can access invoices" ON public.invoices
FOR ALL  
USING (
  auth.uid() IS NOT NULL AND
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 9. Fix payments table
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.payments;

CREATE POLICY "Org members can access payments" ON public.payments
FOR ALL
USING (
  auth.uid() IS NOT NULL AND  
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 10. Fix audit_events table - restrict to authenticated users in org  
DROP POLICY IF EXISTS "Users can view audit events in their organization" ON public.audit_events;

CREATE POLICY "Org members can view audit events" ON public.audit_events
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id  
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 11. Fix location_pricing_overrides table
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.location_pricing_overrides;

CREATE POLICY "Org members can access location pricing overrides" ON public.location_pricing_overrides
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo  
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 12. Fix client_pricing_overrides table  
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.client_pricing_overrides;

CREATE POLICY "Org members can access client pricing overrides" ON public.client_pricing_overrides
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

-- 13. Fix price_versions table
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.price_versions;

CREATE POLICY "Org members can access price versions" ON public.price_versions  
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);