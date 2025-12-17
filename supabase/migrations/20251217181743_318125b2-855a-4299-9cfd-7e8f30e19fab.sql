-- Fix Cottrellville geocoding errors - restore correct city data from legacy fields
UPDATE clients 
SET 
  physical_city = CASE 
    WHEN city IS NOT NULL AND city != '' THEN city
    WHEN zip = '48211' THEN 'Detroit'  -- North End Auto Repair has no city but is in Detroit
    ELSE physical_city
  END,
  physical_zip = COALESCE(zip, physical_zip),
  county = NULL,  -- Clear incorrect county (St. Clair/Cottrellville)
  updated_at = NOW()
WHERE physical_city = 'Cottrellville';

-- Clear bad coordinates from locations with duplicate Cottrellville coords
UPDATE locations 
SET 
  latitude = NULL, 
  longitude = NULL, 
  updated_at = NOW()
WHERE latitude = 42.71278770 AND longitude = -82.58916040;