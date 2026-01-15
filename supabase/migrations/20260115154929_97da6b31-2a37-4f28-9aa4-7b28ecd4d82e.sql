-- =============================================================
-- SECURITY FIX: Enable RLS on user_organization_roles table
-- This table currently has RLS DISABLED which is a critical issue
-- =============================================================

-- First, create a security definer function to check user's own membership
-- This avoids infinite recursion when checking RLS on user_organization_roles itself
CREATE OR REPLACE FUNCTION public.is_own_user_role(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = check_user_id
      AND u.auth_user_id = auth.uid()
  );
$$;

-- Function to check if current user is an admin in the organization
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = org_id
      AND uo.role = 'admin'
  );
$$;

-- Enable RLS on user_organization_roles
ALTER TABLE public.user_organization_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own roles
CREATE POLICY "Users can view own organization roles"
ON public.user_organization_roles
FOR SELECT
USING (
  public.is_own_user_role(user_id)
);

-- Policy: Admins can view all roles in their organizations
CREATE POLICY "Admins can view org roles"
ON public.user_organization_roles
FOR SELECT
USING (
  public.is_org_admin(organization_id)
);

-- Policy: Service role can do everything (for backend operations)
CREATE POLICY "Service role full access"
ON public.user_organization_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Admins can insert new roles in their organizations
CREATE POLICY "Admins can insert org roles"
ON public.user_organization_roles
FOR INSERT
WITH CHECK (
  public.is_org_admin(organization_id)
);

-- Policy: Admins can update roles in their organizations
CREATE POLICY "Admins can update org roles"
ON public.user_organization_roles
FOR UPDATE
USING (
  public.is_org_admin(organization_id)
);

-- Policy: Admins can delete roles in their organizations (except their own admin role)
CREATE POLICY "Admins can delete org roles"
ON public.user_organization_roles
FOR DELETE
USING (
  public.is_org_admin(organization_id)
  AND NOT (
    -- Prevent admins from deleting their own admin role
    public.is_own_user_role(user_id)
    AND role = 'admin'
  )
);