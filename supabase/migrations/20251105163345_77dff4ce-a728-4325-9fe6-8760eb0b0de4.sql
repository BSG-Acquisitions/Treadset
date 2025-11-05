-- Create timezone-aligned PTE aggregation functions for dashboard tiles

-- Function: Get today's PTE totals (timezone-aligned)
CREATE OR REPLACE FUNCTION public.get_today_pte_totals(org_id UUID)
RETURNS TABLE (
  pickup_ptes BIGINT,
  dropoff_ptes BIGINT,
  total_ptes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pickup_ptes BIGINT;
  v_dropoff_ptes BIGINT;
BEGIN
  -- Get pickup PTEs for today (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_pickup_ptes
  FROM pickups
  WHERE organization_id = org_id
    AND DATE(timezone('America/Detroit', pickup_date::timestamptz)) = DATE(timezone('America/Detroit', now()));
  
  -- Get dropoff PTEs for today (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_dropoff_ptes
  FROM dropoffs
  WHERE organization_id = org_id
    AND DATE(timezone('America/Detroit', dropoff_date::timestamptz)) = DATE(timezone('America/Detroit', now()));
  
  RETURN QUERY SELECT v_pickup_ptes, v_dropoff_ptes, v_pickup_ptes + v_dropoff_ptes;
END;
$$;

-- Function: Get yesterday's PTE totals (timezone-aligned)
CREATE OR REPLACE FUNCTION public.get_yesterday_pte_totals(org_id UUID)
RETURNS TABLE (
  pickup_ptes BIGINT,
  dropoff_ptes BIGINT,
  total_ptes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pickup_ptes BIGINT;
  v_dropoff_ptes BIGINT;
  v_yesterday DATE;
BEGIN
  v_yesterday := DATE(timezone('America/Detroit', now() - INTERVAL '1 day'));
  
  -- Get pickup PTEs for yesterday (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_pickup_ptes
  FROM pickups
  WHERE organization_id = org_id
    AND DATE(timezone('America/Detroit', pickup_date::timestamptz)) = v_yesterday;
  
  -- Get dropoff PTEs for yesterday (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_dropoff_ptes
  FROM dropoffs
  WHERE organization_id = org_id
    AND DATE(timezone('America/Detroit', dropoff_date::timestamptz)) = v_yesterday;
  
  RETURN QUERY SELECT v_pickup_ptes, v_dropoff_ptes, v_pickup_ptes + v_dropoff_ptes;
END;
$$;

-- Function: Get this week's PTE totals (Monday through today, timezone-aligned)
CREATE OR REPLACE FUNCTION public.get_weekly_pte_totals(org_id UUID)
RETURNS TABLE (
  pickup_ptes BIGINT,
  dropoff_ptes BIGINT,
  total_ptes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pickup_ptes BIGINT;
  v_dropoff_ptes BIGINT;
  v_week_start DATE;
  v_today DATE;
BEGIN
  v_today := DATE(timezone('America/Detroit', now()));
  v_week_start := DATE(date_trunc('week', timezone('America/Detroit', now())));
  
  -- Get pickup PTEs for this week (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_pickup_ptes
  FROM pickups
  WHERE organization_id = org_id
    AND DATE(timezone('America/Detroit', pickup_date::timestamptz)) BETWEEN v_week_start AND v_today;
  
  -- Get dropoff PTEs for this week (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_dropoff_ptes
  FROM dropoffs
  WHERE organization_id = org_id
    AND DATE(timezone('America/Detroit', dropoff_date::timestamptz)) BETWEEN v_week_start AND v_today;
  
  RETURN QUERY SELECT v_pickup_ptes, v_dropoff_ptes, v_pickup_ptes + v_dropoff_ptes;
END;
$$;

-- Function: Get this month's PTE totals (1st through today, timezone-aligned)
CREATE OR REPLACE FUNCTION public.get_monthly_pte_totals(org_id UUID)
RETURNS TABLE (
  pickup_ptes BIGINT,
  dropoff_ptes BIGINT,
  total_ptes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pickup_ptes BIGINT;
  v_dropoff_ptes BIGINT;
  v_month_start DATE;
  v_today DATE;
BEGIN
  v_today := DATE(timezone('America/Detroit', now()));
  v_month_start := DATE(date_trunc('month', timezone('America/Detroit', now())));
  
  -- Get pickup PTEs for this month (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_pickup_ptes
  FROM pickups
  WHERE organization_id = org_id
    AND DATE(timezone('America/Detroit', pickup_date::timestamptz)) BETWEEN v_month_start AND v_today;
  
  -- Get dropoff PTEs for this month (EST)
  SELECT COALESCE(SUM(pte_count), 0)
  INTO v_dropoff_ptes
  FROM dropoffs
  WHERE organization_id = org_id
    AND DATE(timezone('America/Detroit', dropoff_date::timestamptz)) BETWEEN v_month_start AND v_today;
  
  RETURN QUERY SELECT v_pickup_ptes, v_dropoff_ptes, v_pickup_ptes + v_dropoff_ptes;
END;
$$;