-- Drop all existing policies on user_organization_roles
DROP POLICY IF EXISTS "Users can view their own organization roles" ON public.user_organization_roles;
DROP POLICY IF EXISTS "Admins can manage organization roles" ON public.user_organization_roles;

-- Create a simple policy that allows access when auth is disabled OR when user exists
CREATE POLICY "Allow access to user organization roles" 
  ON public.user_organization_roles 
  FOR ALL 
  USING (
    auth.uid() IS NULL OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_user_id = auth.uid()
    )
  );