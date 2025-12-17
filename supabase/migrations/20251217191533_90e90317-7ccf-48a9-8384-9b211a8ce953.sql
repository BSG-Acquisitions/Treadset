-- Fix the 3 Holt, MI locations with correct coordinates
-- These were incorrectly geocoded to ~42.80, -83.72 (near Brighton/Fenton)
-- Correct location for 2345 N Eifert Rd, Holt, MI 48842 is ~42.6475, -84.5167 (near Lansing)

UPDATE public.locations
SET 
  latitude = 42.6475,
  longitude = -84.5167,
  updated_at = NOW()
WHERE address ILIKE '%2345 N Eifert%'
   OR address ILIKE '%Holt%MI%48842%'
   OR (
     name IN ('Tasmanian Tire Co.', 'Tazmanian Tire', 'Tire Disposal Co.')
     AND (latitude > 42.75 OR longitude > -84.0)
   );

-- Also update any locations that are incorrectly placed outside Michigan bounds
-- (longitude should be between -84.8 and -82.4 for SE Michigan service area)
UPDATE public.locations
SET 
  latitude = NULL,
  longitude = NULL,
  updated_at = NOW()
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND (longitude < -85.5 OR longitude > -82.0 OR latitude < 41.5 OR latitude > 43.5);