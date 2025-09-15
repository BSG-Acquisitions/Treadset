-- Add sample vehicles for testing pickup scheduling
INSERT INTO public.vehicles (name, license_plate, capacity, organization_id, is_active) VALUES
('Truck 001', 'BSG-001', 100, 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73', true),
('Truck 002', 'BSG-002', 150, 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73', true),
('Van 003', 'BSG-003', 75, 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73', true);