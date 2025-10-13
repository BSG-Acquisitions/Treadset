
-- Calculate revenue for all pickups that have zero revenue but should have it calculated
-- This uses the existing calculate_pickup_revenue function
UPDATE pickups
SET computed_revenue = public.calculate_pickup_revenue(pickups.*)
WHERE computed_revenue = 0
  AND (pte_count > 0 OR otr_count > 0 OR tractor_count > 0)
  AND pickup_date >= '2025-09-01';

-- Rebuild client_summaries from scratch to ensure accuracy
DELETE FROM client_summaries WHERE year = 2025;

-- Recreate summaries from actual pickup data
INSERT INTO client_summaries (
  client_id,
  year,
  month,
  total_pickups,
  total_ptes,
  total_otr,
  total_tractor,
  total_revenue,
  first_pickup_date,
  last_pickup_date,
  organization_id
)
SELECT 
  p.client_id,
  EXTRACT(YEAR FROM p.pickup_date)::INTEGER as year,
  EXTRACT(MONTH FROM p.pickup_date)::INTEGER as month,
  COUNT(*) as total_pickups,
  COALESCE(SUM(p.pte_count), 0) as total_ptes,
  COALESCE(SUM(p.otr_count), 0) as total_otr,
  COALESCE(SUM(p.tractor_count), 0) as total_tractor,
  COALESCE(SUM(p.computed_revenue), 0) as total_revenue,
  MIN(p.pickup_date) as first_pickup_date,
  MAX(p.pickup_date) as last_pickup_date,
  p.organization_id
FROM pickups p
WHERE p.pickup_date >= '2025-09-01'
  AND EXTRACT(YEAR FROM p.pickup_date) = 2025
GROUP BY p.client_id, EXTRACT(YEAR FROM p.pickup_date), EXTRACT(MONTH FROM p.pickup_date), p.organization_id;
