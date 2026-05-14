-- Build 5.8 — top nav tag seed + deactivate dead sidebar entries
--
-- Z confirmed AppSidebar.tsx is dead code (left-side nav was removed long ago,
-- TreadSet uses TopNav exclusively). All my prior sidebar-* tagging was
-- targeting elements that never render. This migration:
--   1. Adds the 7 real top-nav tabs (topnav-{dashboard,clients,pickups,
--      dropoffs,trailers,inventory,reports}) to tready_ui_map
--   2. Marks all sidebar-* entries as is_active = FALSE so Tready stops
--      trying to highlight non-existent elements
--
-- Pairs with data-tready-id additions in src/components/TopNav.tsx.

BEGIN;

-- Deactivate dead sidebar entries (Tready ignores is_active = false rows)
UPDATE public.tready_ui_map
SET is_active = false, updated_at = now()
WHERE element_id LIKE 'sidebar-%';

-- Insert the 7 real top-nav tabs (idempotent ON CONFLICT)
INSERT INTO public.tready_ui_map
  (element_id, label, description, page_path, location_hint, required_roles, required_app_state)
VALUES
  ('topnav-dashboard', 'Dashboard tab',
   'Top-nav tab that takes the user to the main dashboard with today''s tire stats, recent activity, and pending followups.',
   '*', 'top of every page, leftmost tab',
   ARRAY['admin','ops_manager','dispatcher','driver','sales','viewer','super_admin']::app_role[], NULL),

  ('topnav-clients', 'Clients tab',
   'Top-nav tab that takes the user to the clients list — search, add, edit, view client details and history.',
   '*', 'top nav, second tab from the left',
   ARRAY['admin','ops_manager','sales','viewer']::app_role[], NULL),

  ('topnav-pickups', 'Pickups tab',
   'Top-nav dropdown for pickup operations — Today''s Routes and Outbound schedule. Hover to expand.',
   '*', 'top nav, third tab from the left (has a dropdown)',
   ARRAY['admin','ops_manager','dispatcher','viewer']::app_role[], NULL),

  ('topnav-dropoffs', 'Drop-offs tab',
   'Top-nav tab for tire drop-offs — when clients bring tires TO the recycling facility instead of waiting for a pickup.',
   '*', 'top nav, fourth tab from the left',
   ARRAY['admin','ops_manager','sales','viewer']::app_role[], NULL),

  ('topnav-trailers', 'Trailers tab',
   'Top-nav dropdown for trailer fleet management — Inventory, Routes, Vehicles, Drivers, Reports. Hover to expand.',
   '*', 'top nav, fifth tab from the left (has a dropdown)',
   ARRAY['admin','ops_manager','dispatcher','viewer']::app_role[], NULL),

  ('topnav-inventory', 'Inventory tab',
   'Top-nav dropdown for inventory tracking — Stock Levels, Products, Shipments. Hover to expand.',
   '*', 'top nav, sixth tab from the left (has a dropdown)',
   ARRAY['admin','ops_manager','dispatcher','viewer']::app_role[], NULL),

  ('topnav-reports', 'Reports tab',
   'Top-nav dropdown for analytics and compliance reports. Hover to expand.',
   '*', 'top nav, rightmost tab (has a dropdown)',
   ARRAY['admin','ops_manager','viewer']::app_role[], NULL)

ON CONFLICT (element_id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  page_path = EXCLUDED.page_path,
  location_hint = EXCLUDED.location_hint,
  required_roles = EXCLUDED.required_roles,
  required_app_state = EXCLUDED.required_app_state,
  is_active = true,
  updated_at = now();

COMMIT;

-- Verify:
-- SELECT element_id, is_active FROM tready_ui_map ORDER BY is_active DESC, element_id;
