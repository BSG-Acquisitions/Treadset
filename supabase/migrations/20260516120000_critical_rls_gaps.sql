-- ============================================================================
-- Migration: critical_rls_gaps (revised post-diagnosis)
-- Date:      2026-05-14
-- Branch:    fix/critical-rls-gaps
-- Source:    REVIEWS/TENANT_ISOLATION_AUDIT.md §1 — substantially reconciled
--            against prod pg_policies + information_schema on 2026-05-14.
--
-- Reality check vs. audit:
--   The 2026-05-14 audit listed 5 "critical RLS gaps". Prod-side verification
--   on the same day revealed:
--     - client_risk_scores_beta does not exist. The actual table is
--       client_risk_scores; it already has RLS on with a tenant-isolated
--       SELECT policy gated to admin/sales/ops_manager. No action needed.
--     - contact_submissions, client_workflows, outbound_assignments all
--       already have tenant-isolated policies (4, 1, and 3 respectively)
--       with within-tenant role gating where appropriate. No action needed.
--     - invoice_items has a permissive policy
--         USING (true) WITH CHECK (true)
--       making it open across tenants. This is the only real gap.
--
--   This migration fixes invoice_items only.
--
-- Why invoice_items inherits scope via parent invoices:
--   invoice_items has no organization_id column. Its tenant boundary lives
--   on the parent invoices table. An EXISTS subquery against
--   invoices.organization_id is the correct scoping mechanism. RLS on the
--   parent invoices table is already in place (audit §1 confirmed).
--
-- Reverses:
--   DROP POLICY IF EXISTS "tenant_select_invoice_items" ON public.invoice_items;
--   DROP POLICY IF EXISTS "tenant_modify_invoice_items" ON public.invoice_items;
--   CREATE POLICY "Allow all operations on invoice_items"
--     ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);
--
-- Recursion safety (CLAUDE.md §2):
--   Policies reference public.invoices and the standard
--   user_organization_roles + users JOIN. None re-enter invoice_items.
--   No recursion risk.
--
-- Compliance scope (treadset-core):
--   invoice_items is billing-side, downstream of invoices. Not manifest
--   content, PTE math, categorization, or hauler/generator data.
--   Engineering scope, not joint-Captain.
-- ============================================================================

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "tenant_select_invoice_items"           ON public.invoice_items;
DROP POLICY IF EXISTS "tenant_modify_invoice_items"           ON public.invoice_items;

CREATE POLICY "tenant_select_invoice_items"
  ON public.invoice_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices inv
      WHERE inv.id = invoice_items.invoice_id
        AND inv.organization_id IN (
          SELECT uo.organization_id
          FROM public.user_organization_roles uo
          JOIN public.users u ON uo.user_id = u.id
          WHERE u.auth_user_id = auth.uid()
        )
    )
  );

CREATE POLICY "tenant_modify_invoice_items"
  ON public.invoice_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.invoices inv
      WHERE inv.id = invoice_items.invoice_id
        AND inv.organization_id IN (
          SELECT uo.organization_id
          FROM public.user_organization_roles uo
          JOIN public.users u ON uo.user_id = u.id
          WHERE u.auth_user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.invoices inv
      WHERE inv.id = invoice_items.invoice_id
        AND inv.organization_id IN (
          SELECT uo.organization_id
          FROM public.user_organization_roles uo
          JOIN public.users u ON uo.user_id = u.id
          WHERE u.auth_user_id = auth.uid()
        )
    )
  );

-- ============================================================================
-- End of migration.
-- ============================================================================
