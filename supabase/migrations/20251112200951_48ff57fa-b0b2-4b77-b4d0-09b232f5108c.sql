-- Revert the incorrect automated pricing calculations from the previous migration
-- These manifests should have $0 revenue since the driver never actually entered pricing

-- Reset Repair Once and Avis Ford manifests that were incorrectly calculated
UPDATE manifests
SET 
  total = 0,
  updated_at = now()
WHERE id IN (
  SELECT m.id 
  FROM manifests m
  JOIN clients c ON m.client_id = c.id
  WHERE c.company_name IN ('Repair Once Tire & Auto (Monroe)', 'Avis Ford')
    AND m.status = 'COMPLETED'
    AND m.updated_at > '2025-11-12 19:00:00+00'  -- Only revert recent automated changes
);

-- Also reset the pickup revenue fields
UPDATE pickups
SET 
  computed_revenue = 0,
  final_revenue = 0,
  updated_at = now()
WHERE id IN (
  SELECT p.id
  FROM pickups p
  JOIN manifests m ON p.id = m.pickup_id
  JOIN clients c ON m.client_id = c.id
  WHERE c.company_name IN ('Repair Once Tire & Auto (Monroe)', 'Avis Ford')
    AND m.status = 'COMPLETED'
    AND p.updated_at > '2025-11-12 19:00:00+00'  -- Only revert recent automated changes
);