-- Add a second test vehicle to demonstrate multi-fleet operation
INSERT INTO public.vehicles (name, capacity, license_plate, organization_id, is_active)
VALUES ('ABC Trucking', 600, 'ABC-001', 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73', true);