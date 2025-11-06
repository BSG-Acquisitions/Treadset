-- Fix PTE calculation functions to include ALL tire types from dropoffs
-- Convert OTR and tractor counts to PTEs (OTR = 15 PTEs, Tractor = 5 PTEs)

-- 1️⃣ Today's PTEs - Fixed to include all tire types
CREATE OR REPLACE FUNCTION public.get_today_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
SELECT 
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date = CURRENT_DATE) AS pickup_ptes,
  (SELECT COALESCE(SUM(
    COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
  ),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date = CURRENT_DATE
   AND manifest_id IS NULL) AS dropoff_ptes,
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date = CURRENT_DATE) +
  (SELECT COALESCE(SUM(
    COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
  ),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date = CURRENT_DATE
   AND manifest_id IS NULL) AS total_ptes;
$$;

-- 2️⃣ Yesterday's PTEs - Fixed to include all tire types
CREATE OR REPLACE FUNCTION public.get_yesterday_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
SELECT 
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date = CURRENT_DATE - 1) AS pickup_ptes,
  (SELECT COALESCE(SUM(
    COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
  ),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date = CURRENT_DATE - 1
   AND manifest_id IS NULL) AS dropoff_ptes,
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date = CURRENT_DATE - 1) +
  (SELECT COALESCE(SUM(
    COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
  ),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date = CURRENT_DATE - 1
   AND manifest_id IS NULL) AS total_ptes;
$$;

-- 3️⃣ Weekly PTEs - Fixed to include all tire types
CREATE OR REPLACE FUNCTION public.get_weekly_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
SELECT 
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date >= date_trunc('week', CURRENT_DATE)::date
   AND COALESCE(signed_at, created_at)::date <= CURRENT_DATE) AS pickup_ptes,
  (SELECT COALESCE(SUM(
    COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
  ),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date >= date_trunc('week', CURRENT_DATE)::date
   AND dropoff_date::date <= CURRENT_DATE
   AND manifest_id IS NULL) AS dropoff_ptes,
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date >= date_trunc('week', CURRENT_DATE)::date
   AND COALESCE(signed_at, created_at)::date <= CURRENT_DATE) +
  (SELECT COALESCE(SUM(
    COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
  ),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date >= date_trunc('week', CURRENT_DATE)::date
   AND dropoff_date::date <= CURRENT_DATE
   AND manifest_id IS NULL) AS total_ptes;
$$;

-- 4️⃣ Monthly PTEs - Fixed to include all tire types
CREATE OR REPLACE FUNCTION public.get_monthly_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
SELECT 
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date >= date_trunc('month', CURRENT_DATE)::date
   AND COALESCE(signed_at, created_at)::date <= CURRENT_DATE) AS pickup_ptes,
  (SELECT COALESCE(SUM(
    COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
  ),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date >= date_trunc('month', CURRENT_DATE)::date
   AND dropoff_date::date <= CURRENT_DATE
   AND manifest_id IS NULL) AS dropoff_ptes,
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date >= date_trunc('month', CURRENT_DATE)::date
   AND COALESCE(signed_at, created_at)::date <= CURRENT_DATE) +
  (SELECT COALESCE(SUM(
    COALESCE(pte_count,0) + (COALESCE(otr_count,0) * 15) + (COALESCE(tractor_count,0) * 5)
  ),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date >= date_trunc('month', CURRENT_DATE)::date
   AND dropoff_date::date <= CURRENT_DATE
   AND manifest_id IS NULL) AS total_ptes;
$$;