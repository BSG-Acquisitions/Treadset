
-- Fix Crest Ford Flat Rock: clear bad coordinates and update address with full context
UPDATE locations 
SET 
  latitude = NULL, 
  longitude = NULL, 
  address = '22675 Gibraltar Rd, Flat Rock, MI 48134',
  updated_at = NOW()
WHERE client_id = '6bb3889f-a9fd-4af4-99cb-2a12403334c1';

-- Fix Royal Auto Clinic: clear bad coordinates (has same coords as CCP Detroit, but should be in Warren)
UPDATE locations 
SET 
  latitude = NULL, 
  longitude = NULL,
  address = '16500 E. Warren, Warren, MI 48093',
  updated_at = NOW()
WHERE id = 'd9cae34a-10a4-4428-840f-acbc185865f5';

-- Also update CCP's address to be more specific
UPDATE locations 
SET 
  address = '14500 E. Warren, Detroit, MI 48215',
  updated_at = NOW()
WHERE id = 'dd05c21e-ea8e-46a7-bda9-bdb5c4dcf984';
