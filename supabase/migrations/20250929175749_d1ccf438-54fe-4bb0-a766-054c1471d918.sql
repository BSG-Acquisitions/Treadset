-- Fix current assignments with missing driver_id
UPDATE assignments 
SET driver_id = '78111d9f-18da-4b12-9faa-d76e3636a40f'
WHERE id = '968ec620-9047-4b71-aaa4-3b037b359cbd';

-- Update vehicles to have proper driver assignments
UPDATE vehicles 
SET assigned_driver_id = '78111d9f-18da-4b12-9faa-d76e3636a40f',
    driver_email = 'oaklandreds20@gmail.com'
WHERE name LIKE '%Test Driver%';

-- Ensure Test Driver has proper assignments for all vehicles they should drive
UPDATE vehicles 
SET assigned_driver_id = '78111d9f-18da-4b12-9faa-d76e3636a40f',
    driver_email = 'oaklandreds20@gmail.com'
WHERE id = '7d3ed861-e27b-4297-9471-421cd6197374';

-- Update any other assignments that might be missing driver_id where vehicle has an assigned driver
UPDATE assignments 
SET driver_id = (
  SELECT v.assigned_driver_id 
  FROM vehicles v 
  WHERE v.id = assignments.vehicle_id 
  AND v.assigned_driver_id IS NOT NULL
)
WHERE driver_id IS NULL 
AND vehicle_id IS NOT NULL 
AND EXISTS (
  SELECT 1 FROM vehicles v 
  WHERE v.id = assignments.vehicle_id 
  AND v.assigned_driver_id IS NOT NULL
);