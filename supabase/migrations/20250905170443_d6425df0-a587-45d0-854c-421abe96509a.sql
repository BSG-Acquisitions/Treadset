-- Strict auth: remove public allowances and scope driver data

-- 1) Make user_has_role require authentication
CREATE OR REPLACE FUNCTION public.user_has_role(user_role app_role, org_slug text DEFAULT 'bsg'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  org_id UUID;
BEGIN
  -- Deny when unauthenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT id INTO org_id FROM public.organizations WHERE slug = org_slug;

  RETURN EXISTS(
    SELECT 1 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE uo.organization_id = org_id 
      AND uo.role = user_role
      AND u.auth_user_id = auth.uid()
  );
END;
$function$;

-- 2) Pickups: remove public access; add scoped driver view
DROP POLICY IF EXISTS "Clients can only view their pickups" ON public.pickups;
DROP POLICY IF EXISTS "Staff can manage all pickups" ON public.pickups;

CREATE POLICY "Clients can view their pickups"
ON public.pickups
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    JOIN public.clients c ON c.id = public.pickups.client_id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = public.pickups.organization_id
      AND uo.role = 'client'::app_role
      AND u.email = c.email
  )
);

CREATE POLICY "Admin and ops manage all pickups"
ON public.pickups
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = public.pickups.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = public.pickups.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
  )
);

CREATE POLICY "Drivers can view assigned pickups"
ON public.pickups
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.manifests m
    JOIN public.users u ON u.id = m.driver_id
    WHERE u.auth_user_id = auth.uid()
      AND m.pickup_id = public.pickups.id
      AND m.organization_id = public.pickups.organization_id
  )
);

-- 3) Manifests: remove public, keep driver scoped manage
DROP POLICY IF EXISTS "Admins and ops can manage all manifests" ON public.manifests;
DROP POLICY IF EXISTS "Drivers can manage their manifests" ON public.manifests;

CREATE POLICY "Admins and ops can manage all manifests"
ON public.manifests
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = public.manifests.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = public.manifests.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role])
  )
);

CREATE POLICY "Drivers can manage their manifests"
ON public.manifests
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = public.manifests.organization_id
      AND uo.role = 'driver'::app_role
      AND u.id = public.manifests.driver_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = public.manifests.organization_id
      AND uo.role = 'driver'::app_role
      AND u.id = public.manifests.driver_id
  )
);

-- 4) user_organization_roles: require authentication
DROP POLICY IF EXISTS "Allow access to user organization roles" ON public.user_organization_roles;

CREATE POLICY "Allow authenticated access to user organization roles"
ON public.user_organization_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = auth.uid()
  )
);
