-- Drop and recreate the function with proper revenue calculation
DROP FUNCTION IF EXISTS public.get_live_client_analytics(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.get_live_client_analytics(
  p_organization_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
  total_clients BIGINT,
  total_pickups BIGINT,
  total_revenue NUMERIC,
  total_ptes BIGINT,
  total_otr BIGINT,
  total_tractor BIGINT,
  total_weight_tons NUMERIC,
  avg_revenue_per_pickup NUMERIC,
  avg_ptes_per_pickup NUMERIC,
  monthly_data JSONB,
  top_clients JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monthly_data JSONB;
  v_top_clients JSONB;
  v_pte_rate NUMERIC;
  v_otr_rate NUMERIC;
  v_tractor_rate NUMERIC;
BEGIN
  -- Get default rates from organization settings
  SELECT 
    COALESCE(default_pte_rate, 25.00),
    COALESCE(default_otr_rate, 45.00),
    COALESCE(default_tractor_rate, 35.00)
  INTO v_pte_rate, v_otr_rate, v_tractor_rate
  FROM organization_settings
  WHERE id = p_organization_id
  LIMIT 1;

  -- Use default values if no settings found
  v_pte_rate := COALESCE(v_pte_rate, 25.00);
  v_otr_rate := COALESCE(v_otr_rate, 45.00);
  v_tractor_rate := COALESCE(v_tractor_rate, 35.00);

  -- Calculate monthly breakdown with computed revenue
  SELECT jsonb_agg(
    jsonb_build_object(
      'month', month_num,
      'pickups', COALESCE(pickup_count, 0),
      'revenue', COALESCE(revenue, 0),
      'ptes', COALESCE(ptes, 0)
    ) ORDER BY month_num
  ) INTO v_monthly_data
  FROM (
    SELECT 
      EXTRACT(MONTH FROM COALESCE(m.signed_at, m.created_at))::INTEGER as month_num,
      COUNT(DISTINCT m.pickup_id) as pickup_count,
      SUM(
        CASE 
          WHEN m.total > 0 THEN m.total
          ELSE (
            (COALESCE(m.pte_on_rim, 0) + COALESCE(m.pte_off_rim, 0)) * v_pte_rate +
            COALESCE(m.otr_count, 0) * v_otr_rate +
            COALESCE(m.tractor_count, 0) * v_tractor_rate
          )
        END
      ) as revenue,
      SUM(COALESCE(m.pte_on_rim, 0) + COALESCE(m.pte_off_rim, 0)) as ptes
    FROM manifests m
    WHERE m.organization_id = p_organization_id
      AND m.status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
      AND EXTRACT(YEAR FROM COALESCE(m.signed_at, m.created_at)) = p_year
    GROUP BY EXTRACT(MONTH FROM COALESCE(m.signed_at, m.created_at))
  ) monthly;

  -- Calculate top clients by computed revenue
  SELECT jsonb_agg(
    jsonb_build_object(
      'client_id', client_id,
      'company_name', company_name,
      'revenue', revenue,
      'pickups', pickups,
      'ptes', ptes
    ) ORDER BY revenue DESC
  ) INTO v_top_clients
  FROM (
    SELECT 
      c.id as client_id,
      c.company_name,
      COALESCE(SUM(
        CASE 
          WHEN m.total > 0 THEN m.total
          ELSE (
            (COALESCE(m.pte_on_rim, 0) + COALESCE(m.pte_off_rim, 0)) * v_pte_rate +
            COALESCE(m.otr_count, 0) * v_otr_rate +
            COALESCE(m.tractor_count, 0) * v_tractor_rate
          )
        END
      ), 0) as revenue,
      COUNT(DISTINCT m.pickup_id) as pickups,
      SUM(COALESCE(m.pte_on_rim, 0) + COALESCE(m.pte_off_rim, 0)) as ptes
    FROM clients c
    LEFT JOIN manifests m ON m.client_id = c.id 
      AND m.status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
      AND m.organization_id = p_organization_id
      AND EXTRACT(YEAR FROM COALESCE(m.signed_at, m.created_at)) = p_year
    WHERE c.organization_id = p_organization_id
      AND c.is_active = true
    GROUP BY c.id, c.company_name
    HAVING SUM(COALESCE(m.pte_on_rim, 0) + COALESCE(m.pte_off_rim, 0)) > 0
    ORDER BY revenue DESC
    LIMIT 10
  ) top;

  -- Return aggregated data with computed revenue
  RETURN QUERY
  SELECT
    -- Total active clients
    (SELECT COUNT(*) FROM clients WHERE organization_id = p_organization_id AND is_active = true)::BIGINT,
    
    -- Total completed pickups in year
    (SELECT COUNT(DISTINCT pickup_id) FROM manifests 
     WHERE organization_id = p_organization_id 
       AND status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(signed_at, created_at)) = p_year)::BIGINT,
    
    -- Total revenue in year (computed from tire counts)
    (SELECT COALESCE(SUM(
       CASE 
         WHEN total > 0 THEN total
         ELSE (
           (COALESCE(pte_on_rim, 0) + COALESCE(pte_off_rim, 0)) * v_pte_rate +
           COALESCE(otr_count, 0) * v_otr_rate +
           COALESCE(tractor_count, 0) * v_tractor_rate
         )
       END
     ), 0) FROM manifests 
     WHERE organization_id = p_organization_id 
       AND status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(signed_at, created_at)) = p_year),
    
    -- Total PTEs in year
    (SELECT COALESCE(SUM(pte_on_rim + pte_off_rim), 0) FROM manifests 
     WHERE organization_id = p_organization_id 
       AND status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(signed_at, created_at)) = p_year)::BIGINT,
    
    -- Total OTR in year
    (SELECT COALESCE(SUM(otr_count), 0) FROM manifests 
     WHERE organization_id = p_organization_id 
       AND status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(signed_at, created_at)) = p_year)::BIGINT,
    
    -- Total Tractor in year
    (SELECT COALESCE(SUM(tractor_count), 0) FROM manifests 
     WHERE organization_id = p_organization_id 
       AND status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(signed_at, created_at)) = p_year)::BIGINT,
    
    -- Total weight in tons
    (SELECT COALESCE(SUM(weight_tons), 0) FROM manifests 
     WHERE organization_id = p_organization_id 
       AND status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(signed_at, created_at)) = p_year),
    
    -- Average revenue per pickup
    (SELECT 
       CASE 
         WHEN COUNT(DISTINCT pickup_id) > 0 THEN
           COALESCE(SUM(
             CASE 
               WHEN total > 0 THEN total
               ELSE (
                 (COALESCE(pte_on_rim, 0) + COALESCE(pte_off_rim, 0)) * v_pte_rate +
                 COALESCE(otr_count, 0) * v_otr_rate +
                 COALESCE(tractor_count, 0) * v_tractor_rate
               )
             END
           ), 0) / COUNT(DISTINCT pickup_id)
         ELSE 0
       END
     FROM manifests 
     WHERE organization_id = p_organization_id 
       AND status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(signed_at, created_at)) = p_year),
    
    -- Average PTEs per pickup
    (SELECT 
       CASE 
         WHEN COUNT(DISTINCT pickup_id) > 0 THEN
           COALESCE(SUM(pte_on_rim + pte_off_rim), 0)::NUMERIC / COUNT(DISTINCT pickup_id)
         ELSE 0
       END
     FROM manifests 
     WHERE organization_id = p_organization_id 
       AND status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(signed_at, created_at)) = p_year),
    
    -- Monthly data
    COALESCE(v_monthly_data, '[]'::jsonb),
    
    -- Top clients
    COALESCE(v_top_clients, '[]'::jsonb);
END;
$$;