-- Create YTD PTE totals function for accurate environmental impact stats
CREATE OR REPLACE FUNCTION public.get_ytd_pte_totals(org_id uuid)
RETURNS TABLE (pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
SELECT 
  -- Pickup PTEs from manifests (excluding those linked to dropoffs to avoid double counting)
  (
    SELECT COALESCE(SUM(
      COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
      5 * (
        COALESCE(tractor_count,0) +
        COALESCE(commercial_17_5_19_5_off,0) + COALESCE(commercial_17_5_19_5_on,0) +
        COALESCE(commercial_22_5_off,0) + COALESCE(commercial_22_5_on,0)
      ) +
      15 * COALESCE(otr_count,0)
    ),0)::bigint 
    FROM manifests 
    WHERE organization_id = org_id 
      AND EXTRACT(YEAR FROM COALESCE(signed_at, created_at)) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
      AND id NOT IN (SELECT manifest_id FROM dropoffs WHERE manifest_id IS NOT NULL AND organization_id = org_id)
  ) AS pickup_ptes,
  
  -- Dropoff PTEs
  (
    SELECT COALESCE(SUM(
      COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
    ),0)::bigint 
    FROM dropoffs 
    WHERE organization_id = org_id 
      AND EXTRACT(YEAR FROM dropoff_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  ) AS dropoff_ptes,
  
  -- Combined total
  (
    (
      SELECT COALESCE(SUM(
        COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
        5 * (
          COALESCE(tractor_count,0) +
          COALESCE(commercial_17_5_19_5_off,0) + COALESCE(commercial_17_5_19_5_on,0) +
          COALESCE(commercial_22_5_off,0) + COALESCE(commercial_22_5_on,0)
        ) +
        15 * COALESCE(otr_count,0)
      ),0) 
      FROM manifests 
      WHERE organization_id = org_id 
        AND EXTRACT(YEAR FROM COALESCE(signed_at, created_at)) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
        AND id NOT IN (SELECT manifest_id FROM dropoffs WHERE manifest_id IS NOT NULL AND organization_id = org_id)
    ) +
    (
      SELECT COALESCE(SUM(
        COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
      ),0) 
      FROM dropoffs 
      WHERE organization_id = org_id 
        AND EXTRACT(YEAR FROM dropoff_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    )
  )::bigint AS total_ptes;
$$;