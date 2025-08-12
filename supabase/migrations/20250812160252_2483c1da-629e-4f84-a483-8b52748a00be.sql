
-- First, drop the existing policies that are causing recursion
DROP POLICY IF EXISTS "Users can view their organization roles" ON public.user_organization_roles;
DROP POLICY IF EXISTS "Users can manage their organization roles" ON public.user_organization_roles;

-- Create simpler, non-recursive policies
CREATE POLICY "Users can view their organization roles" 
  ON public.user_organization_roles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = user_organization_roles.user_id 
      AND users.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage organization roles" 
  ON public.user_organization_roles 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.user_organization_roles admin_role ON u.id = admin_role.user_id
      WHERE u.auth_user_id = auth.uid() 
      AND admin_role.role = 'admin'
      AND admin_role.organization_id = user_organization_roles.organization_id
    )
  );
