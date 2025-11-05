-- Fix double-counting in PTE total functions
-- Only count dropoffs that DON'T have a linked manifest (manifest_id IS NULL)
-- This prevents counting the same tires twice when a dropoff creates a manifest

-- 1️⃣ Tires Recycled Today (Fixed)
CREATE OR REPLACE FUNCTION public.get_today_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
AS $$
SELECT 
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date = CURRENT_DATE) AS pickup_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date = CURRENT_DATE
   AND manifest_id IS NULL) AS dropoff_ptes,
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date = CURRENT_DATE) +
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date = CURRENT_DATE
   AND manifest_id IS NULL) AS total_ptes;
$$;

-- 2️⃣ Tires Recycled Yesterday (Fixed)
CREATE OR REPLACE FUNCTION public.get_yesterday_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
AS $$
SELECT 
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date = CURRENT_DATE - 1) AS pickup_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date = CURRENT_DATE - 1
   AND manifest_id IS NULL) AS dropoff_ptes,
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date = CURRENT_DATE - 1) +
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date = CURRENT_DATE - 1
   AND manifest_id IS NULL) AS total_ptes;
$$;

-- 3️⃣ Tires Recycled This Week (Monday–Today) (Fixed)
CREATE OR REPLACE FUNCTION public.get_weekly_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
AS $$
SELECT 
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date >= date_trunc('week', CURRENT_DATE)::date
   AND COALESCE(signed_at, created_at)::date <= CURRENT_DATE) AS pickup_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
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
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date >= date_trunc('week', CURRENT_DATE)::date
   AND dropoff_date::date <= CURRENT_DATE
   AND manifest_id IS NULL) AS total_ptes;
$$;

-- 4️⃣ Tires Recycled This Month (Fixed)
CREATE OR REPLACE FUNCTION public.get_monthly_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
AS $$
SELECT 
  (SELECT COALESCE(SUM(
    COALESCE(pte_on_rim,0) + COALESCE(pte_off_rim,0) + 
    COALESCE(otr_count,0) + COALESCE(tractor_count,0)
  ),0) FROM manifests 
   WHERE organization_id = org_id 
   AND COALESCE(signed_at, created_at)::date >= date_trunc('month', CURRENT_DATE)::date
   AND COALESCE(signed_at, created_at)::date <= CURRENT_DATE) AS pickup_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
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
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date >= date_trunc('month', CURRENT_DATE)::date
   AND dropoff_date::date <= CURRENT_DATE
   AND manifest_id IS NULL) AS total_ptes;
$$;