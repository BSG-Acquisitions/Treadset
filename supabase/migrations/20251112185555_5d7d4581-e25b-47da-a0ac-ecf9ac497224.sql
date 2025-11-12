-- Broaden manifests update policy to include 'sales' role (front office)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'manifests' AND policyname = 'manifests_update_org_staff'
  ) THEN
    EXECUTE 'DROP POLICY manifests_update_org_staff ON public.manifests';
  END IF;
END $$;

CREATE POLICY manifests_update_org_staff
ON public.manifests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_organization_roles uo
    WHERE uo.user_id = (SELECT auth.uid())
      AND uo.organization_id = public.manifests.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role, 'driver'::app_role, 'sales'::app_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_organization_roles uo
    WHERE uo.user_id = (SELECT auth.uid())
      AND uo.organization_id = public.manifests.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role, 'driver'::app_role, 'sales'::app_role])
  )
);