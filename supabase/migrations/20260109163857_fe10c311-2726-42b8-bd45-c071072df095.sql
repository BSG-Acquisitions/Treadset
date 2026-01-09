-- Backfill driver_id for assignments where it's NULL but can be resolved from vehicle
UPDATE assignments a
SET driver_id = u.id
FROM vehicles v
JOIN users u ON lower(u.email) = lower(v.driver_email)
WHERE a.vehicle_id = v.id
  AND a.driver_id IS NULL
  AND v.driver_email IS NOT NULL;