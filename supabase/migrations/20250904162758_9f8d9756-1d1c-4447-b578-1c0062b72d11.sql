-- Secure RLS for public.users to prevent public reads while preserving functionality

-- Remove overly-permissive ALL policy
DROP POLICY IF EXISTS "Allow user operations when authenticated or auth disabled" ON public.users;

-- SELECT: users can view their own row; admins can view all
CREATE POLICY "Users can select own or admins select all"
ON public.users
FOR SELECT
USING (((select auth.uid()) = auth_user_id) OR public.user_has_role('admin'::app_role));

-- INSERT: admins can insert any user; a user may self-create their own row
CREATE POLICY "Admins insert users or self-insert allowed"
ON public.users
FOR INSERT
WITH CHECK (public.user_has_role('admin'::app_role) OR (((select auth.uid()) IS NOT NULL) AND (auth_user_id = (select auth.uid()))));

-- UPDATE: users can update their own row; admins can update any
CREATE POLICY "Users update own or admins update all"
ON public.users
FOR UPDATE
USING (((select auth.uid()) = auth_user_id) OR public.user_has_role('admin'::app_role))
WITH CHECK (((select auth.uid()) = auth_user_id) OR public.user_has_role('admin'::app_role));

-- DELETE: admins only
CREATE POLICY "Admins delete users"
ON public.users
FOR DELETE
USING (public.user_has_role('admin'::app_role));