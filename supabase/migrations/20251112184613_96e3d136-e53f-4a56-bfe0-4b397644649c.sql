-- Allow org members (any staff role) to upload/read receiver signatures under their org namespace
-- Storage policies for manifests bucket
DO $$ BEGIN
  -- SELECT policy
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'org_read_manifests'
  ) THEN
    EXECUTE 'DROP POLICY org_read_manifests ON storage.objects';
  END IF;

  -- INSERT policy
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'org_upload_signatures'
  ) THEN
    EXECUTE 'DROP POLICY org_upload_signatures ON storage.objects';
  END IF;
END $$;

-- Ensure RLS is enabled on storage.objects (it is by default in Supabase)
-- CREATE OR REPLACE policies
CREATE POLICY org_read_manifests
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'manifests'
  AND EXISTS (
    SELECT 1 FROM public.user_organization_roles uo
    WHERE uo.user_id = (SELECT auth.uid())
      AND uo.organization_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY org_upload_signatures
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'manifests'
  AND EXISTS (
    SELECT 1 FROM public.user_organization_roles uo
    WHERE uo.user_id = (SELECT auth.uid())
      AND name LIKE (uo.organization_id::text || '/signatures/%')
  )
);

-- Manifests update policy to allow front-office roles to complete receiver signature
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'manifests' AND policyname = 'manifests_update_org_staff'
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
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role, 'driver'::app_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_organization_roles uo
    WHERE uo.user_id = (SELECT auth.uid())
      AND uo.organization_id = public.manifests.organization_id
      AND uo.role = ANY (ARRAY['admin'::app_role, 'ops_manager'::app_role, 'dispatcher'::app_role, 'driver'::app_role])
  )
);

-- Optional: tighten to only allow updates that set receiver signature fields or status transitions
-- (Kept broad for now to unblock operations; we can refine later with triggers if required)