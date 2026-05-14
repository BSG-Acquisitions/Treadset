-- Build 5.5 — additional tagged elements
--
-- Pairs with data-tready-id additions to:
--   src/pages/Index.tsx          (dashboard PTE widget — wrapped in div)
--   src/components/TopNav.tsx    (user menu dropdown trigger)
--
-- Same idempotent ON CONFLICT pattern as the prior seed.

BEGIN;

INSERT INTO public.tready_ui_map
  (element_id, label, description, page_path, location_hint, required_roles, required_app_state)
VALUES
  ('dashboard-pte-today', 'Tires Recycled Today widget',
   'The headline KPI card on the dashboard showing today''s PTE total. Click to drill into the per-client breakdown.',
   '/dashboard', 'top-left of the dashboard, big green card',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('topnav-user-menu', 'User menu',
   'The avatar/user-icon button in the top-right of the top nav bar. Opens a dropdown with profile + sign-out.',
   '*', 'top-right of every page, in the header',
   ARRAY['admin','ops_manager','dispatcher','driver','sales','client','hauler','viewer','super_admin']::app_role[], NULL)

ON CONFLICT (element_id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  page_path = EXCLUDED.page_path,
  location_hint = EXCLUDED.location_hint,
  required_roles = EXCLUDED.required_roles,
  required_app_state = EXCLUDED.required_app_state,
  updated_at = now();

COMMIT;
