-- Seed BSG default pricing data
INSERT INTO public.price_matrix (organization_id, tire_category, service_mode, rim, unit_price, source, notes) 
SELECT 
  org.id,
  'passenger'::tire_category,
  'pickup'::service_mode,
  'off'::rim_status,
  2.75,
  'org_default'::price_source,
  'BSG Default - Passenger Pickup'
FROM public.organizations org 
WHERE org.slug = 'bsg'
AND NOT EXISTS (
  SELECT 1 FROM public.price_matrix pm 
  WHERE pm.organization_id = org.id 
  AND pm.tire_category = 'passenger' 
  AND pm.service_mode = 'pickup' 
  AND pm.rim = 'off'
);

INSERT INTO public.price_matrix (organization_id, tire_category, service_mode, rim, unit_price, source, notes) 
SELECT 
  org.id,
  'passenger'::tire_category,
  'dropoff'::service_mode,
  'off'::rim_status,
  2.50,
  'org_default'::price_source,
  'BSG Default - Passenger Drop-off'
FROM public.organizations org 
WHERE org.slug = 'bsg'
AND NOT EXISTS (
  SELECT 1 FROM public.price_matrix pm 
  WHERE pm.organization_id = org.id 
  AND pm.tire_category = 'passenger' 
  AND pm.service_mode = 'dropoff' 
  AND pm.rim = 'off'
);

INSERT INTO public.price_matrix (organization_id, tire_category, service_mode, rim, unit_price, source, notes) 
SELECT 
  org.id,
  'commercial_22_5'::tire_category,
  'pickup'::service_mode,
  'off'::rim_status,
  16.00,
  'org_default'::price_source,
  'BSG Default - Commercial 22.5 Pickup'
FROM public.organizations org 
WHERE org.slug = 'bsg'
AND NOT EXISTS (
  SELECT 1 FROM public.price_matrix pm 
  WHERE pm.organization_id = org.id 
  AND pm.tire_category = 'commercial_22_5' 
  AND pm.service_mode = 'pickup' 
  AND pm.rim = 'off'
);

INSERT INTO public.price_matrix (organization_id, tire_category, service_mode, rim, unit_price, source, notes) 
SELECT 
  org.id,
  'commercial_22_5'::tire_category,
  'dropoff'::service_mode,
  'off'::rim_status,
  10.00,
  'org_default'::price_source,
  'BSG Default - Commercial 22.5 Drop-off'
FROM public.organizations org 
WHERE org.slug = 'bsg'
AND NOT EXISTS (
  SELECT 1 FROM public.price_matrix pm 
  WHERE pm.organization_id = org.id 
  AND pm.tire_category = 'commercial_22_5' 
  AND pm.service_mode = 'dropoff' 
  AND pm.rim = 'off'
);

INSERT INTO public.price_matrix (organization_id, tire_category, service_mode, rim, unit_price, source, notes, needs_confirmation) 
SELECT 
  org.id,
  'commercial_17_5_19_5'::tire_category,
  'pickup'::service_mode,
  'off'::rim_status,
  12.00,
  'org_default'::price_source,
  'BSG Default - Commercial 17.5-19.5 Pickup (NEEDS CONFIRMATION)',
  TRUE
FROM public.organizations org 
WHERE org.slug = 'bsg'
AND NOT EXISTS (
  SELECT 1 FROM public.price_matrix pm 
  WHERE pm.organization_id = org.id 
  AND pm.tire_category = 'commercial_17_5_19_5' 
  AND pm.service_mode = 'pickup' 
  AND pm.rim = 'off'
);

INSERT INTO public.price_matrix (organization_id, tire_category, service_mode, rim, unit_price, source, notes, needs_confirmation) 
SELECT 
  org.id,
  'commercial_17_5_19_5'::tire_category,
  'dropoff'::service_mode,
  'off'::rim_status,
  8.00,
  'org_default'::price_source,
  'BSG Default - Commercial 17.5-19.5 Drop-off (NEEDS CONFIRMATION)',
  TRUE
FROM public.organizations org 
WHERE org.slug = 'bsg'
AND NOT EXISTS (
  SELECT 1 FROM public.price_matrix pm 
  WHERE pm.organization_id = org.id 
  AND pm.tire_category = 'commercial_17_5_19_5' 
  AND pm.service_mode = 'dropoff' 
  AND pm.rim = 'off'
);

-- Seed surcharge rules
INSERT INTO public.surcharge_rules (organization_id, name, type, value_type, value, when_expr) 
SELECT 
  org.id,
  'Passenger Rim Surcharge - Pickup',
  'rim_on'::surcharge_type,
  'flat'::value_type,
  5.00,
  '{"and": [{"==": [{"var": "service_mode"}, "pickup"]}, {"==": [{"var": "tire_category"}, "passenger"]}, {"==": [{"var": "rim"}, "on"]}]}'::jsonb
FROM public.organizations org 
WHERE org.slug = 'bsg'
AND NOT EXISTS (
  SELECT 1 FROM public.surcharge_rules sr 
  WHERE sr.organization_id = org.id 
  AND sr.name = 'Passenger Rim Surcharge - Pickup'
);

INSERT INTO public.surcharge_rules (organization_id, name, type, value_type, value, when_expr) 
SELECT 
  org.id,
  'Passenger Rim Surcharge - Drop-off',
  'rim_on'::surcharge_type,
  'flat'::value_type,
  4.00,
  '{"and": [{"==": [{"var": "service_mode"}, "dropoff"]}, {"==": [{"var": "tire_category"}, "passenger"]}, {"==": [{"var": "rim"}, "on"]}]}'::jsonb
FROM public.organizations org 
WHERE org.slug = 'bsg'
AND NOT EXISTS (
  SELECT 1 FROM public.surcharge_rules sr 
  WHERE sr.organization_id = org.id 
  AND sr.name = 'Passenger Rim Surcharge - Drop-off'
);

INSERT INTO public.surcharge_rules (organization_id, name, type, value_type, value, when_expr) 
SELECT 
  org.id,
  'Commercial Rim Surcharge - Pickup',
  'rim_on'::surcharge_type,
  'flat'::value_type,
  8.00,
  '{"and": [{"==": [{"var": "service_mode"}, "pickup"]}, {"in": [{"var": "tire_category"}, ["commercial_17_5_19_5", "commercial_22_5", "otr"]]}, {"==": [{"var": "rim"}, "on"]}]}'::jsonb
FROM public.organizations org 
WHERE org.slug = 'bsg'
AND NOT EXISTS (
  SELECT 1 FROM public.surcharge_rules sr 
  WHERE sr.organization_id = org.id 
  AND sr.name = 'Commercial Rim Surcharge - Pickup'
);

INSERT INTO public.surcharge_rules (organization_id, name, type, value_type, value, when_expr) 
SELECT 
  org.id,
  'Commercial Rim Surcharge - Drop-off',
  'rim_on'::surcharge_type,
  'flat'::value_type,
  6.00,
  '{"and": [{"==": [{"var": "service_mode"}, "dropoff"]}, {"in": [{"var": "tire_category"}, ["commercial_17_5_19_5", "commercial_22_5", "otr"]]}, {"==": [{"var": "rim"}, "on"]}]}'::jsonb
FROM public.organizations org 
WHERE org.slug = 'bsg'
AND NOT EXISTS (
  SELECT 1 FROM public.surcharge_rules sr 
  WHERE sr.organization_id = org.id 
  AND sr.name = 'Commercial Rim Surcharge - Drop-off'
);