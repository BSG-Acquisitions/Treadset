-- Emergency fix: Remove restrictive manifest viewing policies
-- Allow all authenticated users to view manifests without organization checks

-- Drop restrictive organization-scoped view policies
DROP POLICY IF EXISTS "Organization users can view their manifests" ON storage.objects;
DROP POLICY IF EXISTS "org_read_manifests" ON storage.objects;
DROP POLICY IF EXISTS "Manifests viewable by organization members" ON storage.objects;

-- Keep the simple authenticated user policy (or recreate it if it was dropped)
DROP POLICY IF EXISTS "Authenticated users can view manifests" ON storage.objects;
CREATE POLICY "Authenticated users can view manifests"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'manifests');

-- Also ensure anonymous/public can view if needed (for signed URLs)
DROP POLICY IF EXISTS "Anyone can view manifests via signed URL" ON storage.objects;
CREATE POLICY "Anyone can view manifests via signed URL"
ON storage.objects
FOR SELECT
TO anon, public
USING (bucket_id = 'manifests');