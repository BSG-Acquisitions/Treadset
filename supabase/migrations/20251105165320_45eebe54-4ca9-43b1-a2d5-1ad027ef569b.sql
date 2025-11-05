-- ===== Corrected PTE calculation functions =====
-- Uses subqueries to avoid Cartesian product overcounting from FULL JOIN
-- Pure SQL, no plpgsql variables, simple date comparisons

-- 1️⃣ Tires Recycled Today
CREATE OR REPLACE FUNCTION public.get_today_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
AS $$
SELECT 
  (SELECT COALESCE(SUM(pte_count),0) FROM pickups 
   WHERE organization_id = org_id AND pickup_date::date = CURRENT_DATE) AS pickup_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id AND dropoff_date::date = CURRENT_DATE) AS dropoff_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM pickups 
   WHERE organization_id = org_id AND pickup_date::date = CURRENT_DATE) +
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id AND dropoff_date::date = CURRENT_DATE) AS total_ptes;
$$;

-- 2️⃣ Tires Recycled Yesterday
CREATE OR REPLACE FUNCTION public.get_yesterday_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
AS $$
SELECT 
  (SELECT COALESCE(SUM(pte_count),0) FROM pickups 
   WHERE organization_id = org_id AND pickup_date::date = CURRENT_DATE - 1) AS pickup_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id AND dropoff_date::date = CURRENT_DATE - 1) AS dropoff_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM pickups 
   WHERE organization_id = org_id AND pickup_date::date = CURRENT_DATE - 1) +
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id AND dropoff_date::date = CURRENT_DATE - 1) AS total_ptes;
$$;

-- 3️⃣ Tires Recycled This Week (Monday–Today)
CREATE OR REPLACE FUNCTION public.get_weekly_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
AS $$
SELECT 
  (SELECT COALESCE(SUM(pte_count),0) FROM pickups 
   WHERE organization_id = org_id 
   AND pickup_date::date >= date_trunc('week', CURRENT_DATE)::date
   AND pickup_date::date <= CURRENT_DATE) AS pickup_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date >= date_trunc('week', CURRENT_DATE)::date
   AND dropoff_date::date <= CURRENT_DATE) AS dropoff_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM pickups 
   WHERE organization_id = org_id 
   AND pickup_date::date >= date_trunc('week', CURRENT_DATE)::date
   AND pickup_date::date <= CURRENT_DATE) +
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date >= date_trunc('week', CURRENT_DATE)::date
   AND dropoff_date::date <= CURRENT_DATE) AS total_ptes;
$$;

-- 4️⃣ Tires Recycled This Month
CREATE OR REPLACE FUNCTION public.get_monthly_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE sql
STABLE
AS $$
SELECT 
  (SELECT COALESCE(SUM(pte_count),0) FROM pickups 
   WHERE organization_id = org_id 
   AND pickup_date::date >= date_trunc('month', CURRENT_DATE)::date
   AND pickup_date::date <= CURRENT_DATE) AS pickup_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date >= date_trunc('month', CURRENT_DATE)::date
   AND dropoff_date::date <= CURRENT_DATE) AS dropoff_ptes,
  (SELECT COALESCE(SUM(pte_count),0) FROM pickups 
   WHERE organization_id = org_id 
   AND pickup_date::date >= date_trunc('month', CURRENT_DATE)::date
   AND pickup_date::date <= CURRENT_DATE) +
  (SELECT COALESCE(SUM(pte_count),0) FROM dropoffs 
   WHERE organization_id = org_id 
   AND dropoff_date::date >= date_trunc('month', CURRENT_DATE)::date
   AND dropoff_date::date <= CURRENT_DATE) AS total_ptes;
$$;