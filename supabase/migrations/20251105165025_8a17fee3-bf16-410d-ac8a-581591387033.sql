-- ===== Simplified PTE calculation functions =====
-- No timezone conversions, just plain date comparisons using CURRENT_DATE

-- 1️⃣ Tires Recycled Today
CREATE OR REPLACE FUNCTION public.get_today_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pickup_ptes BIGINT;
  v_dropoff_ptes BIGINT;
BEGIN
  -- Get pickup PTEs for today
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_pickup_ptes
  FROM pickups
  WHERE organization_id = org_id
    AND pickup_date::date = CURRENT_DATE;
  
  -- Get dropoff PTEs for today
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_dropoff_ptes
  FROM dropoffs
  WHERE organization_id = org_id
    AND dropoff_date::date = CURRENT_DATE;
  
  RETURN QUERY SELECT v_pickup_ptes, v_dropoff_ptes, v_pickup_ptes + v_dropoff_ptes;
END;
$function$;

-- 2️⃣ Tires Recycled Yesterday
CREATE OR REPLACE FUNCTION public.get_yesterday_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pickup_ptes BIGINT;
  v_dropoff_ptes BIGINT;
BEGIN
  -- Get pickup PTEs for yesterday
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_pickup_ptes
  FROM pickups
  WHERE organization_id = org_id
    AND pickup_date::date = CURRENT_DATE - 1;
  
  -- Get dropoff PTEs for yesterday
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_dropoff_ptes
  FROM dropoffs
  WHERE organization_id = org_id
    AND dropoff_date::date = CURRENT_DATE - 1;
  
  RETURN QUERY SELECT v_pickup_ptes, v_dropoff_ptes, v_pickup_ptes + v_dropoff_ptes;
END;
$function$;

-- 3️⃣ Tires Recycled This Week (Mon-Sun)
CREATE OR REPLACE FUNCTION public.get_weekly_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pickup_ptes BIGINT;
  v_dropoff_ptes BIGINT;
BEGIN
  -- Get pickup PTEs for this week
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_pickup_ptes
  FROM pickups
  WHERE organization_id = org_id
    AND pickup_date::date >= date_trunc('week', CURRENT_DATE)::date
    AND pickup_date::date <= CURRENT_DATE;
  
  -- Get dropoff PTEs for this week
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_dropoff_ptes
  FROM dropoffs
  WHERE organization_id = org_id
    AND dropoff_date::date >= date_trunc('week', CURRENT_DATE)::date
    AND dropoff_date::date <= CURRENT_DATE;
  
  RETURN QUERY SELECT v_pickup_ptes, v_dropoff_ptes, v_pickup_ptes + v_dropoff_ptes;
END;
$function$;

-- 4️⃣ Tires Recycled This Month
CREATE OR REPLACE FUNCTION public.get_monthly_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pickup_ptes BIGINT;
  v_dropoff_ptes BIGINT;
BEGIN
  -- Get pickup PTEs for this month
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_pickup_ptes
  FROM pickups
  WHERE organization_id = org_id
    AND pickup_date::date >= date_trunc('month', CURRENT_DATE)::date
    AND pickup_date::date <= CURRENT_DATE;
  
  -- Get dropoff PTEs for this month
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_dropoff_ptes
  FROM dropoffs
  WHERE organization_id = org_id
    AND dropoff_date::date >= date_trunc('month', CURRENT_DATE)::date
    AND dropoff_date::date <= CURRENT_DATE;
  
  RETURN QUERY SELECT v_pickup_ptes, v_dropoff_ptes, v_pickup_ptes + v_dropoff_ptes;
END;
$function$;