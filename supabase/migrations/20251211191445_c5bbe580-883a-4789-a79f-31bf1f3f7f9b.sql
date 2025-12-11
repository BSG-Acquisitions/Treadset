-- Update get_live_client_analytics RPC to use actual revenue instead of pricing tier calculations
-- and exclude test companies from all analytics

CREATE OR REPLACE FUNCTION public.get_live_client_analytics(p_organization_id uuid, p_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer)
 RETURNS TABLE(total_clients bigint, total_pickups bigint, total_revenue numeric, total_ptes bigint, total_otr bigint, total_tractor bigint, total_weight_tons numeric, avg_revenue_per_pickup numeric, avg_ptes_per_pickup numeric, monthly_data jsonb, top_clients jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_monthly_data JSONB;
  v_top_clients JSONB;
BEGIN
  -- Calculate monthly breakdown using ACTUAL revenue from manifests.total or pickups.final_revenue
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
          ELSE COALESCE(
            (SELECT COALESCE(p.final_revenue, p.computed_revenue, 0) FROM pickups p WHERE p.id = m.pickup_id),
            0
          )
        END
      ) as revenue,
      SUM(COALESCE(m.pte_on_rim, 0) + COALESCE(m.pte_off_rim, 0)) as ptes
    FROM manifests m
    LEFT JOIN clients c ON m.client_id = c.id
    WHERE m.organization_id = p_organization_id
      AND m.status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
      AND EXTRACT(YEAR FROM COALESCE(m.signed_at, m.created_at)) = p_year
      -- Exclude test companies
      AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%bsg tire%'
      AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%test company%'
    GROUP BY EXTRACT(MONTH FROM COALESCE(m.signed_at, m.created_at))
  ) monthly;

  -- Calculate top clients by ACTUAL revenue
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
          ELSE COALESCE(
            (SELECT COALESCE(p.final_revenue, p.computed_revenue, 0) FROM pickups p WHERE p.id = m.pickup_id),
            0
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
      -- Exclude test companies
      AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%bsg tire%'
      AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%test company%'
    GROUP BY c.id, c.company_name
    HAVING SUM(COALESCE(m.pte_on_rim, 0) + COALESCE(m.pte_off_rim, 0)) > 0
    ORDER BY revenue DESC
    LIMIT 10
  ) top;

  -- Return aggregated data with ACTUAL revenue (no pricing tier calculations)
  RETURN QUERY
  SELECT
    -- Total active clients (excluding test companies)
    (SELECT COUNT(*) FROM clients 
     WHERE organization_id = p_organization_id 
     AND is_active = true
     AND LOWER(COALESCE(company_name, '')) NOT LIKE '%bsg tire%'
     AND LOWER(COALESCE(company_name, '')) NOT LIKE '%test company%')::BIGINT,
    
    -- Total completed pickups in year (excluding test companies)
    (SELECT COUNT(DISTINCT m.pickup_id) FROM manifests m
     LEFT JOIN clients c ON m.client_id = c.id
     WHERE m.organization_id = p_organization_id 
       AND m.status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(m.signed_at, m.created_at)) = p_year
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%bsg tire%'
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%test company%')::BIGINT,
    
    -- Total revenue in year (from manifest.total or pickup.final_revenue - no pricing tier calcs)
    (SELECT COALESCE(SUM(
       CASE 
         WHEN m.total > 0 THEN m.total
         ELSE COALESCE(
           (SELECT COALESCE(p.final_revenue, p.computed_revenue, 0) FROM pickups p WHERE p.id = m.pickup_id),
           0
         )
       END
     ), 0) FROM manifests m
     LEFT JOIN clients c ON m.client_id = c.id
     WHERE m.organization_id = p_organization_id 
       AND m.status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(m.signed_at, m.created_at)) = p_year
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%bsg tire%'
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%test company%'),
    
    -- Total PTEs in year (excluding test companies)
    (SELECT COALESCE(SUM(pte_on_rim + pte_off_rim), 0) FROM manifests m
     LEFT JOIN clients c ON m.client_id = c.id
     WHERE m.organization_id = p_organization_id 
       AND m.status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(m.signed_at, m.created_at)) = p_year
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%bsg tire%'
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%test company%')::BIGINT,
    
    -- Total OTR in year (excluding test companies)
    (SELECT COALESCE(SUM(otr_count), 0) FROM manifests m
     LEFT JOIN clients c ON m.client_id = c.id
     WHERE m.organization_id = p_organization_id 
       AND m.status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(m.signed_at, m.created_at)) = p_year
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%bsg tire%'
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%test company%')::BIGINT,
    
    -- Total Tractor in year (excluding test companies)
    (SELECT COALESCE(SUM(tractor_count), 0) FROM manifests m
     LEFT JOIN clients c ON m.client_id = c.id
     WHERE m.organization_id = p_organization_id 
       AND m.status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(m.signed_at, m.created_at)) = p_year
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%bsg tire%'
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%test company%')::BIGINT,
    
    -- Total weight in tons (excluding test companies)
    (SELECT COALESCE(SUM(weight_tons), 0) FROM manifests m
     LEFT JOIN clients c ON m.client_id = c.id
     WHERE m.organization_id = p_organization_id 
       AND m.status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(m.signed_at, m.created_at)) = p_year
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%bsg tire%'
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%test company%'),
    
    -- Average revenue per pickup (using actual revenue, excluding test companies)
    (SELECT 
       CASE 
         WHEN COUNT(DISTINCT m.pickup_id) > 0 THEN
           COALESCE(SUM(
             CASE 
               WHEN m.total > 0 THEN m.total
               ELSE COALESCE(
                 (SELECT COALESCE(p.final_revenue, p.computed_revenue, 0) FROM pickups p WHERE p.id = m.pickup_id),
                 0
               )
             END
           ), 0) / COUNT(DISTINCT m.pickup_id)
         ELSE 0
       END
     FROM manifests m
     LEFT JOIN clients c ON m.client_id = c.id
     WHERE m.organization_id = p_organization_id 
       AND m.status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(m.signed_at, m.created_at)) = p_year
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%bsg tire%'
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%test company%'),
    
    -- Average PTEs per pickup (excluding test companies)
    (SELECT 
       CASE 
         WHEN COUNT(DISTINCT m.pickup_id) > 0 THEN
           COALESCE(SUM(pte_on_rim + pte_off_rim), 0)::NUMERIC / COUNT(DISTINCT m.pickup_id)
         ELSE 0
       END
     FROM manifests m
     LEFT JOIN clients c ON m.client_id = c.id
     WHERE m.organization_id = p_organization_id 
       AND m.status IN ('COMPLETED', 'AWAITING_RECEIVER_SIGNATURE')
       AND EXTRACT(YEAR FROM COALESCE(m.signed_at, m.created_at)) = p_year
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%bsg tire%'
       AND LOWER(COALESCE(c.company_name, '')) NOT LIKE '%test company%'),
    
    -- Monthly data
    COALESCE(v_monthly_data, '[]'::jsonb),
    
    -- Top clients
    COALESCE(v_top_clients, '[]'::jsonb);
END;
$function$;