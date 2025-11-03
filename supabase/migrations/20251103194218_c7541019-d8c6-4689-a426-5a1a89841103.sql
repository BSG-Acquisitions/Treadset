-- Recalculate revenue in client_summaries using new rates
UPDATE client_summaries cs
SET total_revenue = (
  SELECT COALESCE(SUM(
    COALESCE(m.pte_on_rim, 0) * 2.75 +
    COALESCE(m.pte_off_rim, 0) * 2.75 +
    COALESCE(m.otr_count, 0) * 150.00 +
    COALESCE(m.tractor_count, 0) * 35.00
  ), 0)
  FROM manifests m
  JOIN pickups p ON m.pickup_id = p.id
  WHERE p.client_id = cs.client_id
    AND m.organization_id = cs.organization_id
    AND EXTRACT(YEAR FROM p.pickup_date) = cs.year
    AND (cs.month IS NULL OR EXTRACT(MONTH FROM p.pickup_date) = cs.month)
    AND m.status != 'DRAFT'
)
WHERE cs.organization_id = '68c17f48-13ea-4d10-9fec-5d4b36cdfd24';