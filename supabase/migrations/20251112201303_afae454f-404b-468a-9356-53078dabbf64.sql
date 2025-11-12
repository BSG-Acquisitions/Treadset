-- Reset Avis Ford manifest revenue (company name has trailing space)
-- This manifest should be $0 since the driver never entered actual pricing

UPDATE manifests
SET 
  total = 0,
  updated_at = now()
WHERE id = '982e642a-8826-434f-8b44-a7f6871af458';

-- Reset the corresponding pickup revenue
UPDATE pickups
SET 
  computed_revenue = 0,
  final_revenue = 0,
  updated_at = now()
WHERE id = '7862d37e-a153-44d2-8e38-02ad3c164987';