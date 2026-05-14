-- Build 5.16 — seed the Trailers area for the deep walkthrough.
--
-- Pairs with data-tready-id additions on:
--   src/pages/TrailerInventory.tsx           (page header, status board, add button)
--   src/pages/TrailerVehicles.tsx            (page header)
--   src/pages/TrailerDriverManagement.tsx    (page header)
--   src/pages/TrailerRoutes.tsx              (page header, create button)
-- The topnav-trailers dropdown trigger is already seeded in 20260514160000_tready_topnav_seed.sql.

BEGIN;

INSERT INTO public.tready_ui_map
  (element_id, label, description, page_path, location_hint, required_roles, required_app_state)
VALUES
  ('trailers-page-header', 'Trailer Inventory page header',
   'The H1 on the Trailer Inventory page. Confirms the user landed on the live status board for every trailer in the fleet.',
   '/trailers/inventory', 'top-left of the page, above the Add Trailer button',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('trailers-status-board', 'Status board — Empty / Full / Staged columns',
   'The three-column kanban board on the Trailer Inventory page. Each trailer card lives in exactly one column; drag a card between columns to update its current_status. Click any card to open the trailer detail modal with full event history.',
   '/trailers/inventory', 'main body of the page, three columns',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('trailers-add-button', 'Add Trailer button',
   'Top-right of the Trailer Inventory page. Opens a dialog to register a new trailer with trailer_number, ownership_type, owner_name, and notes.',
   '/trailers/inventory', 'top-right header area',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('trailer-vehicles-page-header', 'Trailer Vehicles page header',
   'The H1 on the Trailer Vehicles page. This is where you register the semi-trucks (and other pulling vehicles) that haul trailers between yards.',
   '/trailers/vehicles', 'top-left of the page',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('trailer-drivers-page-header', 'Trailer Driver Management page header',
   'The H1 on the Trailer Driver Management page. Drivers must have the semi_hauler capability to be assigned to a trailer route; this page is where that capability is granted or revoked.',
   '/trailers/drivers', 'top-left of the page',
   ARRAY['admin','ops_manager']::app_role[], NULL),

  ('trailer-routes-page-header', 'Trailer Routes page header',
   'The H1 on the Trailer Routes page. A route is a sequenced day-plan of trailer moves assigned to one driver + one vehicle. This page lists existing routes by date and lets you create new ones.',
   '/trailers/routes', 'top-left of the page',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('trailer-route-create-button', 'Create Route button',
   'Top-right of the Trailer Routes page. Opens the TrailerRouteWizard — a multi-step flow that walks the user through choosing a date, driver, vehicle, trailer, and stop sequence.',
   '/trailers/routes', 'top-right header area, next to the date picker',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL)

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
