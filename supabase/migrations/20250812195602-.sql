-- Update BSG organization depot coordinates to Detroit processing center
UPDATE organizations 
SET 
  depot_lat = 42.3314,
  depot_lng = -83.0458,
  updated_at = now()
WHERE slug = 'bsg';

-- Update any existing clients that have the old Austin coordinates
UPDATE clients 
SET 
  depot_lat = 42.3314,
  depot_lng = -83.0458,
  updated_at = now()
WHERE depot_lat = 30.2672 AND depot_lng = -97.7431;