-- Tighten RLS on clients table: remove public read and restrict access to org members with roles

-- Ensure RLS is enabled
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Drop overly permissive policy if it exists
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.clients;

-- Read policy: any authenticated user who belongs to the same organization
CREATE POLICY "Org members can read clients"
ON public.clients
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = clients.organization_id
  )
);

-- Insert policy: admins, ops managers, and sales
CREATE POLICY "Admins, ops, sales can insert clients"
ON public.clients
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = clients.organization_id
      AND uo.role IN ('admin','ops_manager','sales')
  )
);

-- Update policy: admins, ops managers, and sales
CREATE POLICY "Admins, ops, sales can update clients"
ON public.clients
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = clients.organization_id
      AND uo.role IN ('admin','ops_manager','sales')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = clients.organization_id
      AND uo.role IN ('admin','ops_manager','sales')
  )
);

-- Delete policy: admins, ops managers, and sales (align with app permissions)
CREATE POLICY "Admins, ops, sales can delete clients"
ON public.clients
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND uo.organization_id = clients.organization_id
      AND uo.role IN ('admin','ops_manager','sales')
  )
);
