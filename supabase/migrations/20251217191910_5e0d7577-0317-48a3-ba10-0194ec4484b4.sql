-- Fix remaining Tasmanian location with wrong coordinates
UPDATE public.locations
SET latitude = 42.6475, longitude = -84.5167, updated_at = NOW()
WHERE name ILIKE '%tasmanian%' AND (latitude > 42.75 OR longitude > -84.0);