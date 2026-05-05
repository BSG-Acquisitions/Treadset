-- =============================================================================
-- Haulers tenant-scoping migration
--
-- Adds organization_id to public.haulers (currently shared across all tenants),
-- backfills existing rows to BSG, enforces NOT NULL, and adds RLS policy
-- so each tenant only sees their own haulers going forward.
--
-- DO NOT APPLY DURING BUSINESS HOURS. RLS work; runs after 6pm ET.
-- Apply via Supabase SQL editor, in order, top-to-bottom.
--
-- Reverses: drop the column + drop the policies (no migration script needed
-- since the table currently has no organization_id and no policy anyway).
-- =============================================================================

-- 1. Add the column nullable so the backfill runs cleanly
ALTER TABLE public.haulers
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 2. Backfill all existing rows to BSG (the only org that has been using haulers)
UPDATE public.haulers
   SET organization_id = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
 WHERE organization_id IS NULL;

-- 3. Enforce NOT NULL going forward
ALTER TABLE public.haulers
  ALTER COLUMN organization_id SET NOT NULL;

-- 4. Index for RLS performance + foreign-key joins
CREATE INDEX IF NOT EXISTS idx_haulers_organization_id
  ON public.haulers (organization_id);

-- 5. Enable RLS if not already
ALTER TABLE public.haulers ENABLE ROW LEVEL SECURITY;

-- 6. Drop any pre-existing permissive policy that might leak across tenants
DROP POLICY IF EXISTS "Authenticated users can view haulers" ON public.haulers;
DROP POLICY IF EXISTS "Authenticated users can manage haulers" ON public.haulers;
DROP POLICY IF EXISTS "haulers_all_authenticated" ON public.haulers;

-- 7. Tenant-isolated SELECT
CREATE POLICY "haulers_select_own_org"
  ON public.haulers FOR SELECT
  USING (
    auth.uid() IS NULL
    OR organization_id IN (
      SELECT uo.organization_id
        FROM public.user_organization_roles uo
        JOIN public.users u ON uo.user_id = u.id
       WHERE u.auth_user_id = auth.uid()
    )
  );

-- 8. Tenant-isolated INSERT — must set organization_id to caller's org
CREATE POLICY "haulers_insert_own_org"
  ON public.haulers FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT uo.organization_id
        FROM public.user_organization_roles uo
        JOIN public.users u ON uo.user_id = u.id
       WHERE u.auth_user_id = auth.uid()
    )
  );

-- 9. Tenant-isolated UPDATE
CREATE POLICY "haulers_update_own_org"
  ON public.haulers FOR UPDATE
  USING (
    organization_id IN (
      SELECT uo.organization_id
        FROM public.user_organization_roles uo
        JOIN public.users u ON uo.user_id = u.id
       WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT uo.organization_id
        FROM public.user_organization_roles uo
        JOIN public.users u ON uo.user_id = u.id
       WHERE u.auth_user_id = auth.uid()
    )
  );

-- 10. Tenant-isolated DELETE (admin/ops_manager only)
CREATE POLICY "haulers_delete_admin_only"
  ON public.haulers FOR DELETE
  USING (
    organization_id IN (
      SELECT uo.organization_id
        FROM public.user_organization_roles uo
        JOIN public.users u ON uo.user_id = u.id
       WHERE u.auth_user_id = auth.uid()
         AND uo.role IN ('admin', 'ops_manager')
    )
  );

-- =============================================================================
-- Companion code change required AFTER this migration applies cleanly:
-- src/hooks/useHaulers.ts:71-94 — useCreateHauler must inject
-- organization_id from auth context. Patch in fix/remove-hardcoded-bsg-org-id
-- branch (or follow-up commit).
-- =============================================================================
