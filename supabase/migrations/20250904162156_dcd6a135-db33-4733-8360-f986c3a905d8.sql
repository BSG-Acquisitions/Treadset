-- Fix organizations INSERT policy: INSERT supports only WITH CHECK
DROP POLICY IF EXISTS "Allow inserting organizations when authenticated or auth disabled" ON public.organizations;

CREATE POLICY "Allow inserting organizations when authenticated or auth disabled"
ON public.organizations
FOR INSERT
WITH CHECK (((select auth.uid()) IS NULL) OR ((select auth.uid()) IS NOT NULL));