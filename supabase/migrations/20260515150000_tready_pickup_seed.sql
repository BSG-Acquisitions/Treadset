-- Build 5.19 — seed the Schedule Pickup dialog for deep tour #5.
--
-- Pairs with data-tready-id additions on:
--   src/pages/EnhancedRoutesToday.tsx    (routes-schedule-pickup-button)
--   src/components/SchedulePickupDialog.tsx
--     (client/location/truck/driver/date/window/pte/otr/tractor/notes/submit)
--
-- topnav-pickups + topnav-pickups-today are already seeded by
-- 20260514180000_tready_pickups_dropdown_seed.sql — not re-inserted here.

BEGIN;

INSERT INTO public.tready_ui_map
  (element_id, label, description, page_path, location_hint, required_roles, required_app_state)
VALUES
  ('routes-schedule-pickup-button', 'Schedule Pickup button',
   'Opens the Schedule New Pickup dialog from the Today''s Routes page header.',
   '/routes/today', 'page header, right side, outline button next to the day-picker',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('pickup-client-select', 'Client combobox',
   'Searchable dropdown to pick the client this pickup is for. Required.',
   '/routes/today', 'Schedule Pickup dialog — top-left, first field',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('pickup-location-select', 'Service Address dropdown',
   'Picks an alternate service address for the client. Defaults to the client''s on-file address.',
   '/routes/today', 'Schedule Pickup dialog — top-right, second field',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('pickup-truck-select', 'Truck or Hauler dropdown',
   'Unified list of internal vehicles and external haulers. Required.',
   '/routes/today', 'Schedule Pickup dialog — full-width field below the client row',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('pickup-driver-select', 'Driver combobox',
   'Searchable dropdown to pick the driver. Auto-fills from the selected vehicle if one is assigned. Optional.',
   '/routes/today', 'Schedule Pickup dialog — full-width field below the truck row',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('pickup-date-picker', 'Pickup Date picker',
   'Calendar to pick the pickup date. Past dates are disabled.',
   '/routes/today', 'Schedule Pickup dialog — date/window row, left',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('pickup-window-select', 'Preferred Time Window dropdown',
   'AM, PM, or Any. Drives the route ordering for the day.',
   '/routes/today', 'Schedule Pickup dialog — date/window row, right',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('pickup-pte-input', 'PTE Count field',
   'Expected passenger-tire count. Used for capacity planning and weekly forecasting.',
   '/routes/today', 'Schedule Pickup dialog — tire-count row, left',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('pickup-otr-input', 'OTR Count field',
   'Expected off-the-road tire count (heavy equipment).',
   '/routes/today', 'Schedule Pickup dialog — tire-count row, middle',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('pickup-tractor-input', 'Tractor Count field',
   'Expected tractor / semi-truck tire count.',
   '/routes/today', 'Schedule Pickup dialog — tire-count row, right',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('pickup-notes-input', 'Notes textarea',
   'Free-text notes that show up on the driver''s mobile manifest. Gate codes, contact names, dock numbers.',
   '/routes/today', 'Schedule Pickup dialog — full-width field above the submit row',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('pickup-submit-button', 'Schedule Pickup submit button',
   'Submits the form and creates the pickup + assignment.',
   '/routes/today', 'Schedule Pickup dialog footer, bottom-right',
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
