-- Insert Kathy Taylor as billing contact for Crest Ford
INSERT INTO public.client_users (client_id, user_id, organization_id, role)
VALUES (
  '6bb3889f-a9fd-4af4-99cb-2a12403334c1',  -- Crest Ford client_id
  '08eab885-fa43-4613-be82-20b40f32533b',  -- Kathy Taylor user_id
  'ba2e9dc3-ecc6-4b73-963b-efe668a03d73',  -- Organization ID
  'billing'
)
ON CONFLICT (client_id, user_id) DO UPDATE SET role = 'billing';