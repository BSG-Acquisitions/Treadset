-- Update the pricing data to use the correct BSG organization ID
UPDATE public.price_matrix 
SET organization_id = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000';

UPDATE public.surcharge_rules 
SET organization_id = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000';