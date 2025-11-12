-- Rollback the incorrect pricing tier migration
-- The previous migration used automated rates which violates business requirements

-- Drop the migration that shouldn't have been created
-- (This is a no-op migration to document the rollback)

-- NOTE: The actual fix needed is:
-- 1. Drivers ARE entering revenue during manifest creation (lines 866, 898 of DriverManifestCreationWizard.tsx)
-- 2. The issue is that this revenue needs to flow from manifests.total to pickups table
-- 3. Some historical manifests may have total=0 if driver didn't enter pricing