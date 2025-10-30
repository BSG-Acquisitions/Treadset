-- Create function to calculate live client analytics from operational data
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
BEGIN
  -- Calculate monthly breakdown
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
      EXTRACT(MONTH FROM m.signed_at)::INTEGER as month_num,
      COUNT(DISTINCT m.pickup_id) as pickup_count,
      SUM(m.total) as revenue,
      SUM(m.pte_on_rim + m.pte_off_rim) as ptes
    FROM manifests m
    WHERE m.organization_id = p_organization_id
      AND m.status = 'COMPLETED'
      AND EXTRACT(YEAR FROM m.signed_at) = p_year
    GROUP BY EXTRACT(MONTH FROM m.signed_at)
  ) monthly;

  -- Calculate top clients by revenue
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
      COALESCE(SUM(m.total), 0) as revenue,
      COUNT(DISTINCT m.pickup_id) as pickups,
      SUM(m.pte_on_rim + m.pte_off_rim) as ptes
    FROM clients c
    LEFT JOIN manifests m ON m.client_id = c.id 
      AND m.status = 'COMPLETED'
      AND m.organization_id = p_organization_id
      AND EXTRACT(YEAR FROM m.signed_at) = p_year
    WHERE c.organization_id = p_organization_id
      AND c.is_active = true
    GROUP BY c.id, c.company_name
    HAVING COALESCE(SUM(m.total), 0) > 0
    ORDER BY revenue DESC
    LIMIT 10
  ) top;

  -- Return aggregated data
  RETURN QUERY
  SELECT
    -- Total active clients
    (SELECT COUNT(*) FROM clients WHERE organization_id = p_organization_id AND is_active = true)::BIGINT,
    -- Total completed pickups in year
    (SELECT COUNT(DISTINCT pickup_id) FROM manifests 
     WHERE organization_id = p_organization_id 
       AND status = 'COMPLETED'
       AND EXTRACT(YEAR FROM signed_at) = p_year)::BIGINT,
    -- Total revenue in year
    (SELECT COALESCE(SUM(total), 0) FROM manifests 
     WHERE organization_id = p_organization_id 
       AND status = 'COMPLETED'
       AND EXTRACT(YEAR FROM signed_at) = p_year),
    -- Total PTEs in year
    (SELECT COALESCE(SUM(pte_on_rim + pte_off_rim), 0) FROM manifests 
     WHERE organization_id = p_organization_id 
       AND status = 'COMPLETED'
       AND EXTRACT(YEAR FROM signed_at) = p_year)::BIGINT,
    -- Total OTR in year
    (SELECT COALESCE(SUM(otr_count), 0) FROM manifests 
     WHERE organization_id = p_organization_id 
       AND status = 'COMPLETED'
       AND EXTRACT(YEAR FROM signed_at) = p_year)::BIGINT,
    -- Total Tractor in year
    (SELECT COALESCE(SUM(tractor_count), 0) FROM manifests 
     WHERE organization_id = p_organization_id 
       AND status = 'COMPLETED'
       AND EXTRACT(YEAR FROM signed_at) = p_year)::BIGINT,
    -- Total weight in tons
    (SELECT COALESCE(SUM(weight_tons), 0) FROM manifests 
     WHERE organization_id = p_organization_id 
       AND status = 'COMPLETED'
       AND EXTRACT(YEAR FROM signed_at) = p_year),
    -- Monthly data
    COALESCE(v_monthly_data, '[]'::jsonb),
    -- Top clients
    COALESCE(v_top_clients, '[]'::jsonb);
END;
$$;