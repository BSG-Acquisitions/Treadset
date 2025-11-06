-- Fix manifest PTE computation to use completion timestamp (signed_at) when available
-- Ensures weekly/monthly totals include manifests created earlier but completed this period

CREATE OR REPLACE FUNCTION public._compute_manifest_ptes(
  p_org_id uuid,
  p_start timestamptz,
  p_end timestamptz
) RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    COALESCE(m.pte_on_rim,0) + COALESCE(m.pte_off_rim,0) +
    5 * (
      COALESCE(m.commercial_17_5_19_5_off,0) + COALESCE(m.commercial_17_5_19_5_on,0) +
      COALESCE(m.commercial_22_5_off,0) + COALESCE(m.commercial_22_5_on,0) +
      COALESCE(m.tractor_count,0)
    ) +
    15 * COALESCE(m.otr_count,0)
  ), 0)::numeric
  FROM public.manifests m
  WHERE m.organization_id = p_org_id
    AND COALESCE(m.signed_at, m.created_at) >= p_start
    AND COALESCE(m.signed_at, m.created_at) < p_end
    AND m.status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE');
$$;