-- Create comprehensive test data for proper app testing

-- Create test pricing tiers
INSERT INTO pricing_tiers (
  id,
  organization_id,
  name,
  description,
  pte_rate,
  otr_rate,
  tractor_rate
)
SELECT 
  gen_random_uuid() as id,
  o.id as organization_id,
  'Standard Pricing' as name,
  'Default pricing tier for testing' as description,
  25.00 as pte_rate,
  45.00 as otr_rate,
  35.00 as tractor_rate
FROM organizations o
LIMIT 1;

INSERT INTO pricing_tiers (
  id,
  organization_id,
  name,
  description,
  pte_rate,
  otr_rate,
  tractor_rate
)
SELECT 
  gen_random_uuid() as id,
  o.id as organization_id,
  'Premium Pricing' as name,
  'Higher rates for premium clients' as description,
  30.00 as pte_rate,
  50.00 as otr_rate,
  40.00 as tractor_rate
FROM organizations o
LIMIT 1;

-- Create test clients with comprehensive data
INSERT INTO clients (
  id,
  organization_id,
  company_name,
  contact_name,
  email,
  phone,
  notes,
  type,
  tags,
  sla_weeks,
  pricing_tier_id,
  lifetime_revenue,
  open_balance,
  is_active
)
SELECT 
  gen_random_uuid() as id,
  o.id as organization_id,
  'Acme Manufacturing Corp' as company_name,
  'John Smith' as contact_name,
  'john.smith@acme-manufacturing.com' as email,
  '+15551234567' as phone,
  'Large manufacturing client with regular tire disposal needs. Prefers morning pickups.' as notes,
  'commercial' as type,
  ARRAY['manufacturing', 'regular', 'priority'] as tags,
  4 as sla_weeks,
  pt.id as pricing_tier_id,
  15250.75 as lifetime_revenue,
  2500.00 as open_balance,
  true as is_active
FROM organizations o
CROSS JOIN pricing_tiers pt
WHERE pt.name = 'Standard Pricing'
LIMIT 1;

INSERT INTO clients (
  id,
  organization_id,
  company_name,
  contact_name,
  email,
  phone,
  notes,
  type,
  tags,
  sla_weeks,
  pricing_tier_id,
  lifetime_revenue,
  open_balance,
  is_active
)
SELECT 
  gen_random_uuid() as id,
  o.id as organization_id,
  'Green Valley Auto' as company_name,
  'Sarah Johnson' as contact_name,
  'sarah@greenvalleyauto.com' as email,
  '+15559876543' as phone,
  'Auto service center with multiple locations. Requires detailed manifest documentation.' as notes,
  'commercial' as type,
  ARRAY['automotive', 'multi-location'] as tags,
  2 as sla_weeks,
  pt.id as pricing_tier_id,
  8750.25 as lifetime_revenue,
  0.00 as open_balance,
  true as is_active
FROM organizations o
CROSS JOIN pricing_tiers pt
WHERE pt.name = 'Premium Pricing'
LIMIT 1;

INSERT INTO clients (
  id,
  organization_id,
  company_name,
  contact_name,
  email,
  phone,
  notes,
  type,
  sla_weeks,
  lifetime_revenue,
  open_balance,
  is_active
)
SELECT 
  gen_random_uuid() as id,
  o.id as organization_id,
  'Residential Customer - Miller' as company_name,
  'Bob Miller' as contact_name,
  'bob.miller@email.com' as email,
  '+15555551234' as phone,
  'Seasonal tire changes, spring and fall pickups typically.' as notes,
  'residential' as type,
  1 as sla_weeks,
  450.00 as lifetime_revenue,
  0.00 as open_balance,
  true as is_active
FROM organizations o
LIMIT 1;

-- Create test locations for the clients
INSERT INTO locations (
  id,
  client_id,
  organization_id,
  name,
  address,
  access_notes,
  pricing_tier_id,
  latitude,
  longitude,
  is_active
)
SELECT 
  gen_random_uuid() as id,
  c.id as client_id,
  c.organization_id,
  'Main Manufacturing Plant' as name,
  '1234 Industrial Blvd, Austin, TX 78744' as address,
  'Loading dock is on the east side of building. Gate code: 1234. Contact security for after-hours access.' as access_notes,
  c.pricing_tier_id,
  30.2389 as latitude,
  -97.7298 as longitude,
  true as is_active
FROM clients c
WHERE c.company_name = 'Acme Manufacturing Corp';

INSERT INTO locations (
  id,
  client_id,
  organization_id,
  name,
  address,
  access_notes,
  latitude,
  longitude,
  is_active
)
SELECT 
  gen_random_uuid() as id,
  c.id as client_id,
  c.organization_id,
  'Warehouse Facility' as name,
  '5678 Commerce Dr, Austin, TX 78745' as address,
  'Tire storage area is behind the main warehouse. Use west entrance.' as access_notes,
  30.2156 as latitude,
  -97.7431 as longitude,
  true as is_active
FROM clients c
WHERE c.company_name = 'Acme Manufacturing Corp';

INSERT INTO locations (
  id,
  client_id,
  organization_id,
  name,
  address,
  access_notes,
  latitude,
  longitude,
  is_active
)
SELECT 
  gen_random_uuid() as id,
  c.id as client_id,
  c.organization_id,
  'North Location' as name,
  '2468 Highway 35 N, Austin, TX 78753' as address,
  'Service bay #3 for tire collection. Manager: Mike Thompson ext. 245' as access_notes,
  30.3072 as latitude,
  -97.7073 as longitude,
  true as is_active
FROM clients c
WHERE c.company_name = 'Green Valley Auto';

INSERT INTO locations (
  id,
  client_id,
  organization_id,
  name,
  address,
  access_notes,
  latitude,
  longitude,
  is_active
)
SELECT 
  gen_random_uuid() as id,
  c.id as client_id,
  c.organization_id,
  'South Location' as name,
  '9876 South Lamar Blvd, Austin, TX 78748' as address,
  'Tire disposal area in rear parking lot. Access through service drive.' as access_notes,
  30.1872 as latitude,
  -97.8073 as longitude,
  true as is_active
FROM clients c
WHERE c.company_name = 'Green Valley Auto';

INSERT INTO locations (
  id,
  client_id,
  organization_id,
  name,
  address,
  access_notes,
  latitude,
  longitude,
  is_active
)
SELECT 
  gen_random_uuid() as id,
  c.id as client_id,
  c.organization_id,
  'Residence' as name,
  '1357 Maple Street, Austin, TX 78704' as address,
  'Tires will be in garage. Please call upon arrival.' as access_notes,
  30.2500 as latitude,
  -97.7600 as longitude,
  true as is_active
FROM clients c
WHERE c.company_name = 'Residential Customer - Miller';

-- Create test vehicles
INSERT INTO vehicles (
  id,
  organization_id,
  name,
  license_plate,
  capacity,
  is_active
)
SELECT 
  gen_random_uuid() as id,
  o.id as organization_id,
  'Truck 001' as name,
  'BSG-001' as license_plate,
  150 as capacity,
  true as is_active
FROM organizations o
LIMIT 1;

INSERT INTO vehicles (
  id,
  organization_id,
  name,
  license_plate,
  capacity,
  is_active
)
SELECT 
  gen_random_uuid() as id,
  o.id as organization_id,
  'Truck 002' as name,
  'BSG-002' as license_plate,
  100 as capacity,
  true as is_active
FROM organizations o
LIMIT 1;

-- Create some test pickups for realistic data
INSERT INTO pickups (
  id,
  organization_id,
  client_id,
  location_id,
  pickup_date,
  pte_count,
  otr_count,
  tractor_count,
  computed_revenue,
  status,
  notes
)
SELECT 
  gen_random_uuid() as id,
  c.organization_id,
  c.id as client_id,
  l.id as location_id,
  CURRENT_DATE - INTERVAL '7 days' as pickup_date,
  45 as pte_count,
  12 as otr_count,
  8 as tractor_count,
  1650.00 as computed_revenue,
  'completed' as status,
  'Regular monthly pickup - all tires collected successfully' as notes
FROM clients c
JOIN locations l ON l.client_id = c.id
WHERE c.company_name = 'Acme Manufacturing Corp'
AND l.name = 'Main Manufacturing Plant'
LIMIT 1;

INSERT INTO pickups (
  id,
  organization_id,
  client_id,
  location_id,
  pickup_date,
  pte_count,
  otr_count,
  tractor_count,
  computed_revenue,
  status,
  notes,
  preferred_window
)
SELECT 
  gen_random_uuid() as id,
  c.organization_id,
  c.id as client_id,
  l.id as location_id,
  CURRENT_DATE + INTERVAL '3 days' as pickup_date,
  25 as pte_count,
  8 as otr_count,
  0 as tractor_count,
  850.00 as computed_revenue,
  'scheduled' as status,
  'Scheduled pickup for tire disposal' as notes,
  'AM' as preferred_window
FROM clients c
JOIN locations l ON l.client_id = c.id
WHERE c.company_name = 'Green Valley Auto'
AND l.name = 'North Location'
LIMIT 1;