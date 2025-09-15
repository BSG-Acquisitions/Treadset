-- Insert sample receivers
INSERT INTO public.receivers (
  receiver_name,
  receiver_mailing_address,
  receiver_city,
  receiver_state,
  receiver_zip,
  receiver_phone,
  is_active
) VALUES 
(
  'Green Valley Recycling Center',
  '2100 Recycling Way',
  'Austin',
  'TX',
  '78744',
  '(512) 555-1001',
  true
),
(
  'EcoTire Processing Facility',
  '4500 Industrial Park Dr',
  'San Antonio',
  'TX',
  '78219',
  '(210) 555-1002',
  true
),
(
  'Texas Tire Recovery LLC',
  '1850 Commerce Center Blvd',
  'Houston',
  'TX',
  '77032',
  '(713) 555-1003',
  true
),
(
  'Central Texas Waste Solutions',
  '3200 Environmental Dr',
  'Round Rock',
  'TX',
  '78664',
  '(512) 555-1004',
  true
),
(
  'Hill Country Materials Recovery',
  '950 Highway 46',
  'New Braunfels',
  'TX',
  '78130',
  '(830) 555-1005',
  true
),
(
  'Lone Star Environmental Services',
  '7600 State Highway 130',
  'Pflugerville',
  'TX',
  '78660',
  '(512) 555-1006',
  true
);