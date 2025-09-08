-- Fix location coordinates for route-planner functionality
-- Update the specific location causing the issue with approximate coordinates for Farmington, MI
UPDATE public.locations 
SET 
  latitude = 42.4642,
  longitude = -83.3762,
  updated_at = now()
WHERE id = '013b829b-bf62-48cf-9975-cb4b32b1ea32';