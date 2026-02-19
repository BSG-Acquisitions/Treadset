
-- Fix: Rewrite all 4 PTE SQL functions with index-friendly WHERE clauses and NOT EXISTS anti-joins
-- Root cause 1: COALESCE(signed_at, created_at)::date breaks index usage → use range comparison
-- Root cause 2: NOT IN (subquery) is slow → replace with NOT EXISTS

-- ============================================================
-- get_today_pte_totals
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_today_pte_totals(org_id uuid)
 RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
SELECT 
  -- Pickup PTEs from manifests (excluding those linked to dropoffs)
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
      AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
      AND (
        signed_at >= date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
        OR created_at >= date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
      )
      AND (
        signed_at < date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit') + INTERVAL '1 day'
        OR created_at < date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit') + INTERVAL '1 day'
      )
      AND NOT EXISTS (
        SELECT 1 FROM dropoffs 
        WHERE manifest_id = manifests.id 
          AND organization_id = org_id
      )
  ) AS pickup_ptes,
  
  -- Dropoff PTEs
  (
    SELECT COALESCE(SUM(
      COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
    ),0)::bigint 
    FROM dropoffs 
    WHERE organization_id = org_id 
      AND dropoff_date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')::date
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
        AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
        AND (
          signed_at >= date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
          OR created_at >= date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
        )
        AND (
          signed_at < date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit') + INTERVAL '1 day'
          OR created_at < date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit') + INTERVAL '1 day'
        )
        AND NOT EXISTS (
          SELECT 1 FROM dropoffs 
          WHERE manifest_id = manifests.id 
            AND organization_id = org_id
        )
    ) +
    (
      SELECT COALESCE(SUM(
        COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
      ),0) 
      FROM dropoffs 
      WHERE organization_id = org_id 
        AND dropoff_date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')::date
    )
  )::bigint AS total_ptes;
$function$;

-- ============================================================
-- get_yesterday_pte_totals
-- ============================================================
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
    ),0)::bigint 
    FROM manifests 
    WHERE organization_id = org_id 
      AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
      AND (
        signed_at >= date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit') - INTERVAL '1 day'
        OR created_at >= date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit') - INTERVAL '1 day'
      )
      AND (
        signed_at < date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
        OR created_at < date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
      )
      AND NOT EXISTS (
        SELECT 1 FROM dropoffs 
        WHERE manifest_id = manifests.id 
          AND organization_id = org_id
      )
  ) AS pickup_ptes,
  
  (
    SELECT COALESCE(SUM(
      COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
    ),0)::bigint 
    FROM dropoffs 
    WHERE organization_id = org_id 
      AND dropoff_date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')::date - 1
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
        AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
        AND (
          signed_at >= date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit') - INTERVAL '1 day'
          OR created_at >= date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit') - INTERVAL '1 day'
        )
        AND (
          signed_at < date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
          OR created_at < date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
        )
        AND NOT EXISTS (
          SELECT 1 FROM dropoffs 
          WHERE manifest_id = manifests.id 
            AND organization_id = org_id
        )
    ) +
    (
      SELECT COALESCE(SUM(
        COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
      ),0) 
      FROM dropoffs 
      WHERE organization_id = org_id 
        AND dropoff_date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')::date - 1
    )
  )::bigint AS total_ptes;
$function$;

-- ============================================================
-- get_weekly_pte_totals
-- ============================================================
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
    ),0)::bigint 
    FROM manifests 
    WHERE organization_id = org_id 
      AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
      AND (
        signed_at >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
        OR created_at >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
      )
      AND NOT EXISTS (
        SELECT 1 FROM dropoffs 
        WHERE manifest_id = manifests.id 
          AND organization_id = org_id
      )
  ) AS pickup_ptes,
  
  (
    SELECT COALESCE(SUM(
      COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
    ),0)::bigint 
    FROM dropoffs 
    WHERE organization_id = org_id 
      AND dropoff_date >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')::date
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
        AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
        AND (
          signed_at >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
          OR created_at >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
        )
        AND NOT EXISTS (
          SELECT 1 FROM dropoffs 
          WHERE manifest_id = manifests.id 
            AND organization_id = org_id
        )
    ) +
    (
      SELECT COALESCE(SUM(
        COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
      ),0) 
      FROM dropoffs 
      WHERE organization_id = org_id 
        AND dropoff_date >= date_trunc('week', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')::date
    )
  )::bigint AS total_ptes;
$function$;

-- ============================================================
-- get_monthly_pte_totals
-- ============================================================
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
    ),0)::bigint 
    FROM manifests 
    WHERE organization_id = org_id 
      AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
      AND (
        signed_at >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
        OR created_at >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
      )
      AND NOT EXISTS (
        SELECT 1 FROM dropoffs 
        WHERE manifest_id = manifests.id 
          AND organization_id = org_id
      )
  ) AS pickup_ptes,
  
  (
    SELECT COALESCE(SUM(
      COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
    ),0)::bigint 
    FROM dropoffs 
    WHERE organization_id = org_id 
      AND dropoff_date >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')::date
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
        AND status IN ('COMPLETED','AWAITING_RECEIVER_SIGNATURE')
        AND (
          signed_at >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
          OR created_at >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')
        )
        AND NOT EXISTS (
          SELECT 1 FROM dropoffs 
          WHERE manifest_id = manifests.id 
            AND organization_id = org_id
        )
    ) +
    (
      SELECT COALESCE(SUM(
        COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
      ),0) 
      FROM dropoffs 
      WHERE organization_id = org_id 
        AND dropoff_date >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/Detroit')::date
    )
  )::bigint AS total_ptes;
$function$;
