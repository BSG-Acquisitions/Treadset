-- Fix multiple permissive policies on organization_settings table
DROP POLICY IF EXISTS "Admins can manage organization settings" ON public.organization_settings;
DROP POLICY IF EXISTS "Users can view organization settings" ON public.organization_settings;

CREATE POLICY "Organization members can manage settings" ON public.organization_settings
FOR ALL USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND uo.role = 'admin'::app_role
    )
  END
) WITH CHECK (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND uo.role = 'admin'::app_role
    )
  END
);

CREATE POLICY "Organization members can view settings" ON public.organization_settings
FOR SELECT USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  END
);

-- Fix multiple permissive policies on organizations table  
DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view organizations" ON public.organizations;

CREATE POLICY "Organization admins can manage" ON public.organizations
FOR ALL USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE auth.uid() IS NOT NULL AND id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND uo.role = 'admin'::app_role
    )
  END
) WITH CHECK (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE auth.uid() IS NOT NULL AND id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND uo.role = 'admin'::app_role
    )
  END
);

CREATE POLICY "Organization members can view" ON public.organizations
FOR SELECT USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE auth.uid() IS NOT NULL AND id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  END
);

-- Fix multiple permissive policies on pickups table
DROP POLICY IF EXISTS "Admins can manage pickups" ON public.pickups;
DROP POLICY IF EXISTS "Users can view pickups" ON public.pickups;
DROP POLICY IF EXISTS "Service role can access pickups" ON public.pickups;

CREATE POLICY "Organization staff can manage pickups" ON public.pickups
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND uo.organization_id = pickups.organization_id
    AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND uo.organization_id = pickups.organization_id
    AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
  )
);

CREATE POLICY "Organization members can view pickups" ON public.pickups
FOR SELECT USING (
  -- Organization staff can view all
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    AND uo.organization_id = pickups.organization_id
    AND uo.role = ANY(ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
  )
  OR
  -- Clients can view their own pickups
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    JOIN clients c ON c.id = pickups.client_id
    WHERE u.auth_user_id = auth.uid()
    AND uo.organization_id = pickups.organization_id
    AND uo.role = 'client'::app_role
    AND u.email = c.email
  )
  OR
  -- Drivers can view assigned pickups
  EXISTS (
    SELECT 1 FROM manifests m
    JOIN users u ON u.id = m.driver_id
    WHERE u.auth_user_id = auth.uid()
    AND m.pickup_id = pickups.id
    AND m.organization_id = pickups.organization_id
  )
);

CREATE POLICY "Service role can access pickups" ON public.pickups
FOR ALL USING (true) WITH CHECK (true);

-- Fix multiple permissive policies on surcharge_rules table
DROP POLICY IF EXISTS "Admins can manage surcharge rules" ON public.surcharge_rules;
DROP POLICY IF EXISTS "Users can view surcharge rules" ON public.surcharge_rules;

CREATE POLICY "Organization admins can manage surcharge rules" ON public.surcharge_rules
FOR ALL USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE auth.uid() IS NOT NULL AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND uo.role = 'admin'::app_role
    )
  END
) WITH CHECK (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE auth.uid() IS NOT NULL AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND uo.role = 'admin'::app_role
    )
  END
);

CREATE POLICY "Organization members can view surcharge rules" ON public.surcharge_rules
FOR SELECT USING (
  CASE 
    WHEN auth.uid() IS NULL THEN false
    ELSE auth.uid() IS NOT NULL AND organization_id IN (
      SELECT uo.organization_id
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  END
);