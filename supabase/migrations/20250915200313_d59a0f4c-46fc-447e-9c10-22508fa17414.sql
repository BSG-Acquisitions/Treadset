-- Insert sample haulers
INSERT INTO public.haulers (
  hauler_name,
  hauler_mailing_address,
  hauler_city,
  hauler_state,
  hauler_zip,
  hauler_phone,
  hauler_mi_reg,
  is_active
) VALUES 
(
  'Austin Waste Solutions',
  '1234 Industrial Blvd',
  'Austin',
  'TX',
  '78701',
  '(512) 555-0123',
  'AWS-TX-2024',
  true
),
(
  'Lone Star Hauling',
  '5678 Commerce Dr',
  'Dallas',
  'TX',
  '75201',
  '(214) 555-0456',
  'LSH-TX-2024',
  true
),
(
  'Hill Country Transport',
  '9012 Highway 290',
  'Dripping Springs',
  'TX',
  '78620',
  '(512) 555-0789',
  'HCT-TX-2024',
  true
),
(
  'Capital City Logistics',
  '3456 Research Blvd',
  'Austin',
  'TX',
  '78759',
  '(512) 555-0321',
  'CCL-TX-2024',
  true
),
(
  'Texas Premier Hauling',
  '7890 State Highway 71',
  'Austin',
  'TX',
  '78735',
  '(512) 555-0654',
  'TPH-TX-2024',
  true
);