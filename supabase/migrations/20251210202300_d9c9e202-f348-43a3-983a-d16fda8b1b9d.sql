-- Fix PTE calculation functions to correctly categorize pickups vs dropoffs
-- Pickups: manifests NOT linked to dropoffs
-- Dropoffs: ALL dropoffs (remove manifest_id IS NULL filter)

CREATE OR REPLACE FUNCTION public.get_today_pte_totals(org_id uuid)
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
    ),0)::bigint FROM manifests 
     WHERE organization_id = org_id 
     AND COALESCE(signed_at, created_at)::date = CURRENT_DATE
     AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
     AND id NOT IN (SELECT manifest_id FROM dropoffs WHERE manifest_id IS NOT NULL AND organization_id = org_id)
  ) AS pickup_ptes,
  (
    SELECT COALESCE(SUM(
      COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
    ),0)::bigint FROM dropoffs 
     WHERE organization_id = org_id 
     AND dropoff_date::date = CURRENT_DATE
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
      ),0) FROM manifests 
       WHERE organization_id = org_id 
       AND COALESCE(signed_at, created_at)::date = CURRENT_DATE
       AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
       AND id NOT IN (SELECT manifest_id FROM dropoffs WHERE manifest_id IS NOT NULL AND organization_id = org_id)
    ) +
    (
      SELECT COALESCE(SUM(
        COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
      ),0) FROM dropoffs 
       WHERE organization_id = org_id 
       AND dropoff_date::date = CURRENT_DATE
    )
  )::bigint AS total_ptes;
$function$;

CREATE OR REPLACE FUNCTION public.get_yesterday_pte_totals(org_id uuid)
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
    ),0)::bigint FROM manifests 
     WHERE organization_id = org_id 
     AND COALESCE(signed_at, created_at)::date = CURRENT_DATE - 1
     AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
     AND id NOT IN (SELECT manifest_id FROM dropoffs WHERE manifest_id IS NOT NULL AND organization_id = org_id)
  ) AS pickup_ptes,
  (
    SELECT COALESCE(SUM(
      COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
    ),0)::bigint FROM dropoffs 
     WHERE organization_id = org_id 
     AND dropoff_date::date = CURRENT_DATE - 1
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
      ),0) FROM manifests 
       WHERE organization_id = org_id 
       AND COALESCE(signed_at, created_at)::date = CURRENT_DATE - 1
       AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
       AND id NOT IN (SELECT manifest_id FROM dropoffs WHERE manifest_id IS NOT NULL AND organization_id = org_id)
    ) +
    (
      SELECT COALESCE(SUM(
        COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
      ),0) FROM dropoffs 
       WHERE organization_id = org_id 
       AND dropoff_date::date = CURRENT_DATE - 1
    )
  )::bigint AS total_ptes;
$function$;

CREATE OR REPLACE FUNCTION public.get_weekly_pte_totals(org_id uuid)
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
    ),0)::bigint FROM manifests 
     WHERE organization_id = org_id 
     AND COALESCE(signed_at, created_at)::date >= date_trunc('week', CURRENT_DATE)::date
     AND COALESCE(signed_at, created_at)::date <= CURRENT_DATE
     AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
     AND id NOT IN (SELECT manifest_id FROM dropoffs WHERE manifest_id IS NOT NULL AND organization_id = org_id)
  ) AS pickup_ptes,
  (
    SELECT COALESCE(SUM(
      COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
    ),0)::bigint FROM dropoffs 
     WHERE organization_id = org_id 
     AND dropoff_date::date >= date_trunc('week', CURRENT_DATE)::date
     AND dropoff_date::date <= CURRENT_DATE
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
      ),0) FROM manifests 
       WHERE organization_id = org_id 
       AND COALESCE(signed_at, created_at)::date >= date_trunc('week', CURRENT_DATE)::date
       AND COALESCE(signed_at, created_at)::date <= CURRENT_DATE
       AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
       AND id NOT IN (SELECT manifest_id FROM dropoffs WHERE manifest_id IS NOT NULL AND organization_id = org_id)
    ) +
    (
      SELECT COALESCE(SUM(
        COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
      ),0) FROM dropoffs 
       WHERE organization_id = org_id 
       AND dropoff_date::date >= date_trunc('week', CURRENT_DATE)::date
       AND dropoff_date::date <= CURRENT_DATE
    )
  )::bigint AS total_ptes;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_pte_totals(org_id uuid)
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
    ),0)::bigint FROM manifests 
     WHERE organization_id = org_id 
     AND COALESCE(signed_at, created_at)::date >= date_trunc('month', CURRENT_DATE)::date
     AND COALESCE(signed_at, created_at)::date <= CURRENT_DATE
     AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
     AND id NOT IN (SELECT manifest_id FROM dropoffs WHERE manifest_id IS NOT NULL AND organization_id = org_id)
  ) AS pickup_ptes,
  (
    SELECT COALESCE(SUM(
      COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
    ),0)::bigint FROM dropoffs 
     WHERE organization_id = org_id 
     AND dropoff_date::date >= date_trunc('month', CURRENT_DATE)::date
     AND dropoff_date::date <= CURRENT_DATE
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
      ),0) FROM manifests 
       WHERE organization_id = org_id 
       AND COALESCE(signed_at, created_at)::date >= date_trunc('month', CURRENT_DATE)::date
       AND COALESCE(signed_at, created_at)::date <= CURRENT_DATE
       AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
       AND id NOT IN (SELECT manifest_id FROM dropoffs WHERE manifest_id IS NOT NULL AND organization_id = org_id)
    ) +
    (
      SELECT COALESCE(SUM(
        COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
      ),0) FROM dropoffs 
       WHERE organization_id = org_id 
       AND dropoff_date::date >= date_trunc('month', CURRENT_DATE)::date
       AND dropoff_date::date <= CURRENT_DATE
    )
  )::bigint AS total_ptes;
$function$;