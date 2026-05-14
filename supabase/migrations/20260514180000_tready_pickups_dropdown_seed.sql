-- Build 5.14 — seed Pickups dropdown children
BEGIN;
INSERT INTO public.tready_ui_map
  (element_id, label, description, page_path, location_hint, required_roles, required_app_state)
VALUES
  ('topnav-pickups-today', 'Today''s Routes link',
   'Inside the Pickups top-nav dropdown. Takes you to today''s scheduled pickups + driver assignments.',
   '*', 'Pickups dropdown → first item',
   ARRAY['admin','ops_manager','dispatcher','viewer']::app_role[], NULL),
  ('topnav-pickups-outbound', 'Outbound link',
   'Inside the Pickups top-nav dropdown. The outbound delivery schedule — tires going OUT to processors.',
   '*', 'Pickups dropdown → second item',
   ARRAY['admin','ops_manager','dispatcher','viewer']::app_role[], NULL)
ON CONFLICT (element_id) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description,
  page_path = EXCLUDED.page_path, location_hint = EXCLUDED.location_hint,
  required_roles = EXCLUDED.required_roles, is_active = true, updated_at = now();
COMMIT;
