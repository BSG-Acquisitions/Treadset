-- Correct PTE calculations in period RPCs to include commercial/semi (×5) and OTR (×15)
-- and to date by completion time COALESCE(signed_at, created_at)

CREATE OR REPLACE FUNCTION public.get_today_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
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
  ) AS pickup_ptes,
  (
    SELECT COALESCE(SUM(
      COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
    ),0)::bigint FROM dropoffs 
     WHERE organization_id = org_id 
     AND dropoff_date::date = CURRENT_DATE
     AND manifest_id IS NULL
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
    ) +
    (
      SELECT COALESCE(SUM(
        COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
      ),0) FROM dropoffs 
       WHERE organization_id = org_id 
       AND dropoff_date::date = CURRENT_DATE
       AND manifest_id IS NULL
    )
  )::bigint AS total_ptes;
$$;

CREATE OR REPLACE FUNCTION public.get_yesterday_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
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
  ) AS pickup_ptes,
  (
    SELECT COALESCE(SUM(
      COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
    ),0)::bigint FROM dropoffs 
     WHERE organization_id = org_id 
     AND dropoff_date::date = CURRENT_DATE - 1
     AND manifest_id IS NULL
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
    ) +
    (
      SELECT COALESCE(SUM(
        COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
      ),0) FROM dropoffs 
       WHERE organization_id = org_id 
       AND dropoff_date::date = CURRENT_DATE - 1
       AND manifest_id IS NULL
    )
  )::bigint AS total_ptes;
$$;

CREATE OR REPLACE FUNCTION public.get_weekly_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
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
  ) AS pickup_ptes,
  (
    SELECT COALESCE(SUM(
      COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
    ),0)::bigint FROM dropoffs 
     WHERE organization_id = org_id 
     AND dropoff_date::date >= date_trunc('week', CURRENT_DATE)::date
     AND dropoff_date::date <= CURRENT_DATE
     AND manifest_id IS NULL
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
    ) +
    (
      SELECT COALESCE(SUM(
        COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
      ),0) FROM dropoffs 
       WHERE organization_id = org_id 
       AND dropoff_date::date >= date_trunc('week', CURRENT_DATE)::date
       AND dropoff_date::date <= CURRENT_DATE
       AND manifest_id IS NULL
    )
  )::bigint AS total_ptes;
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
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
  ) AS pickup_ptes,
  (
    SELECT COALESCE(SUM(
      COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
    ),0)::bigint FROM dropoffs 
     WHERE organization_id = org_id 
     AND dropoff_date::date >= date_trunc('month', CURRENT_DATE)::date
     AND dropoff_date::date <= CURRENT_DATE
     AND manifest_id IS NULL
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
    ) +
    (
      SELECT COALESCE(SUM(
        COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
      ),0) FROM dropoffs 
       WHERE organization_id = org_id 
       AND dropoff_date::date >= date_trunc('month', CURRENT_DATE)::date
       AND dropoff_date::date <= CURRENT_DATE
       AND manifest_id IS NULL
    )
  )::bigint AS total_ptes;
$$;