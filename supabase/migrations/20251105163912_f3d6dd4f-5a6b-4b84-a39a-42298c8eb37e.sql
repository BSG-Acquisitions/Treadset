-- Fix all four PTE RPC functions for consistent EST alignment and Monday-based weeks

-- Get today's PTE totals (EST aligned)
CREATE OR REPLACE FUNCTION public.get_today_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pickup_ptes BIGINT;
  v_dropoff_ptes BIGINT;
  v_today DATE;
BEGIN
  -- Get today in EST
  v_today := DATE((now() AT TIME ZONE 'UTC') AT TIME ZONE 'America/Detroit');
  
  -- Get pickup PTEs for today (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_pickup_ptes
  FROM pickups
  WHERE organization_id = org_id
    AND DATE((pickup_date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Detroit') = v_today;
  
  -- Get dropoff PTEs for today (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_dropoff_ptes
  FROM dropoffs
  WHERE organization_id = org_id
    AND DATE((dropoff_date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Detroit') = v_today;
  
  RETURN QUERY SELECT v_pickup_ptes, v_dropoff_ptes, v_pickup_ptes + v_dropoff_ptes;
END;
$function$;

-- Get yesterday's PTE totals (EST aligned)
CREATE OR REPLACE FUNCTION public.get_yesterday_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pickup_ptes BIGINT;
  v_dropoff_ptes BIGINT;
  v_yesterday DATE;
BEGIN
  -- Get yesterday in EST
  v_yesterday := DATE((now() AT TIME ZONE 'UTC') AT TIME ZONE 'America/Detroit') - INTERVAL '1 day';
  
  -- Get pickup PTEs for yesterday (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_pickup_ptes
  FROM pickups
  WHERE organization_id = org_id
    AND DATE((pickup_date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Detroit') = v_yesterday;
  
  -- Get dropoff PTEs for yesterday (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_dropoff_ptes
  FROM dropoffs
  WHERE organization_id = org_id
    AND DATE((dropoff_date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Detroit') = v_yesterday;
  
  RETURN QUERY SELECT v_pickup_ptes, v_dropoff_ptes, v_pickup_ptes + v_dropoff_ptes;
END;
$function$;

-- Get weekly PTE totals (EST aligned, Monday-based week)
CREATE OR REPLACE FUNCTION public.get_weekly_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pickup_ptes BIGINT;
  v_dropoff_ptes BIGINT;
  v_week_start DATE;
  v_today DATE;
  v_dow INT;
BEGIN
  -- Get today in EST
  v_today := DATE((now() AT TIME ZONE 'UTC') AT TIME ZONE 'America/Detroit');
  
  -- Calculate Monday as start of week (DOW: 0=Sunday, 1=Monday, ..., 6=Saturday)
  v_dow := EXTRACT(DOW FROM v_today)::INT;
  -- If Sunday (0), go back 6 days; if Monday (1), go back 0 days; etc.
  v_week_start := v_today - (CASE WHEN v_dow = 0 THEN 6 ELSE v_dow - 1 END);
  
  -- Get pickup PTEs for this week (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_pickup_ptes
  FROM pickups
  WHERE organization_id = org_id
    AND DATE((pickup_date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Detroit') BETWEEN v_week_start AND v_today;
  
  -- Get dropoff PTEs for this week (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_dropoff_ptes
  FROM dropoffs
  WHERE organization_id = org_id
    AND DATE((dropoff_date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Detroit') BETWEEN v_week_start AND v_today;
  
  RETURN QUERY SELECT v_pickup_ptes, v_dropoff_ptes, v_pickup_ptes + v_dropoff_ptes;
END;
$function$;

-- Get monthly PTE totals (EST aligned)
CREATE OR REPLACE FUNCTION public.get_monthly_pte_totals(org_id uuid)
RETURNS TABLE(pickup_ptes bigint, dropoff_ptes bigint, total_ptes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pickup_ptes BIGINT;
  v_dropoff_ptes BIGINT;
  v_month_start DATE;
  v_today DATE;
BEGIN
  -- Get today in EST
  v_today := DATE((now() AT TIME ZONE 'UTC') AT TIME ZONE 'America/Detroit');
  
  -- Get first day of current month in EST
  v_month_start := DATE(date_trunc('month', (now() AT TIME ZONE 'UTC') AT TIME ZONE 'America/Detroit'));
  
  -- Get pickup PTEs for this month (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_pickup_ptes
  FROM pickups
  WHERE organization_id = org_id
    AND DATE((pickup_date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Detroit') BETWEEN v_month_start AND v_today;
  
  -- Get dropoff PTEs for this month (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_dropoff_ptes
  FROM dropoffs
  WHERE organization_id = org_id
    AND DATE((dropoff_date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Detroit') BETWEEN v_month_start AND v_today;
  
  RETURN QUERY SELECT v_pickup_ptes, v_dropoff_ptes, v_pickup_ptes + v_dropoff_ptes;
END;
$function$;