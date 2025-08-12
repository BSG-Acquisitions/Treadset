-- Re-seed BSG default pricing data with correct organization ID
INSERT INTO public.price_matrix (organization_id, tire_category, service_mode, rim, unit_price, source, notes) 
SELECT 
  'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'::uuid,
  'passenger'::tire_category,
  'pickup'::service_mode,
  'off'::rim_status,
  2.75,
  'org_default'::price_source,
  'BSG Default - Passenger Pickup'
WHERE NOT EXISTS (
  SELECT 1 FROM public.price_matrix pm 
  WHERE pm.organization_id = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
  AND pm.tire_category = 'passenger' 
  AND pm.service_mode = 'pickup' 
  AND pm.rim = 'off'
);

INSERT INTO public.price_matrix (organization_id, tire_category, service_mode, rim, unit_price, source, notes) 
SELECT 
  'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'::uuid,
  'passenger'::tire_category,
  'dropoff'::service_mode,
  'off'::rim_status,
  2.50,
  'org_default'::price_source,
  'BSG Default - Passenger Drop-off'
WHERE NOT EXISTS (
  SELECT 1 FROM public.price_matrix pm 
  WHERE pm.organization_id = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
  AND pm.tire_category = 'passenger' 
  AND pm.service_mode = 'dropoff' 
  AND pm.rim = 'off'
);

INSERT INTO public.price_matrix (organization_id, tire_category, service_mode, rim, unit_price, source, notes) 
SELECT 
  'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'::uuid,
  'commercial_22_5'::tire_category,
  'pickup'::service_mode,
  'off'::rim_status,
  16.00,
  'org_default'::price_source,
  'BSG Default - Commercial 22.5 Pickup'
WHERE NOT EXISTS (
  SELECT 1 FROM public.price_matrix pm 
  WHERE pm.organization_id = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
  AND pm.tire_category = 'commercial_22_5' 
  AND pm.service_mode = 'pickup' 
  AND pm.rim = 'off'
);

INSERT INTO public.price_matrix (organization_id, tire_category, service_mode, rim, unit_price, source, notes) 
SELECT 
  'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'::uuid,
  'commercial_22_5'::tire_category,
  'dropoff'::service_mode,
  'off'::rim_status,
  10.00,
  'org_default'::price_source,
  'BSG Default - Commercial 22.5 Drop-off'
WHERE NOT EXISTS (
  SELECT 1 FROM public.price_matrix pm 
  WHERE pm.organization_id = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
  AND pm.tire_category = 'commercial_22_5' 
  AND pm.service_mode = 'dropoff' 
  AND pm.rim = 'off'
);

-- Re-seed surcharge rules
INSERT INTO public.surcharge_rules (organization_id, name, type, value_type, value, when_expr) 
SELECT 
  'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'::uuid,
  'Passenger Rim Surcharge - Pickup',
  'rim_on'::surcharge_type,
  'flat'::value_type,
  5.00,
  '{"and": [{"==": [{"var": "service_mode"}, "pickup"]}, {"==": [{"var": "tire_category"}, "passenger"]}, {"==": [{"var": "rim"}, "on"]}]}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.surcharge_rules sr 
  WHERE sr.organization_id = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
  AND sr.name = 'Passenger Rim Surcharge - Pickup'
);

INSERT INTO public.surcharge_rules (organization_id, name, type, value_type, value, when_expr) 
SELECT 
  'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'::uuid,
  'Passenger Rim Surcharge - Drop-off',
  'rim_on'::surcharge_type,
  'flat'::value_type,
  4.00,
  '{"and": [{"==": [{"var": "service_mode"}, "dropoff"]}, {"==": [{"var": "tire_category"}, "passenger"]}, {"==": [{"var": "rim"}, "on"]}]}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.surcharge_rules sr 
  WHERE sr.organization_id = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
  AND sr.name = 'Passenger Rim Surcharge - Drop-off'
);