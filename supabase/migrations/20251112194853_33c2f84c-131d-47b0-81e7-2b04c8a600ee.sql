-- Backfill manifest total field from pickup revenue
-- This fixes the issue where manifests show $0.00 even though revenue was collected

UPDATE manifests m
SET total = COALESCE(p.final_revenue, p.computed_revenue, 0)
FROM pickups p
WHERE m.pickup_id = p.id
  AND m.total = 0
  AND (p.final_revenue > 0 OR p.computed_revenue > 0);