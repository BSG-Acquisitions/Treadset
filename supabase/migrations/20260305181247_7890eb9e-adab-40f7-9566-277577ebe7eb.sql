-- Fix _compute_manifest_ptes to exclude outbound manifests
CREATE OR REPLACE FUNCTION public._compute_manifest_ptes(p_org_id uuid, p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
    AND m.status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
    AND (m.direction IS NULL OR m.direction = 'inbound');
$function$;

-- Fix get_ytd_pte_totals to exclude outbound manifests
CREATE OR REPLACE FUNCTION public.get_ytd_pte_totals(org_id uuid)
 RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
SELECT 
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
      AND (direction IS NULL OR direction = 'inbound')
      AND id NOT IN (SELECT manifest_id FROM dropoffs WHERE manifest_id IS NOT NULL AND organization_id = org_id)
  ) AS pickup_ptes,
  (
    SELECT COALESCE(SUM(
      COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
    ),0)::bigint 
    FROM dropoffs 
    WHERE organization_id = org_id 
      AND EXTRACT(YEAR FROM dropoff_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  ) AS dropoff_ptes,
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
        AND (direction IS NULL OR direction = 'inbound')
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
$function$;