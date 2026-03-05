
-- Insert BSG Tire Recycling as a processor entity (origin for outbound shipments)
INSERT INTO public.entities (organization_id, legal_name, kind, is_active)
VALUES ('ba2e9dc3-ecc6-4b73-963b-efe668a03d73', 'BSG Tire Recycling', 'processor', true);

-- Insert Entech Inc. as a processor entity (destination for outbound shipments)
INSERT INTO public.entities (organization_id, legal_name, kind, is_active)
VALUES ('ba2e9dc3-ecc6-4b73-963b-efe668a03d73', 'Entech Inc.', 'processor', true);
