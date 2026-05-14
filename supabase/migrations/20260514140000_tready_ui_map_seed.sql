-- Build 4 — seed tready_ui_map with the demo-path elements
--
-- Pairs with the data-tready-id attributes added to:
--   src/components/AppSidebar.tsx (5 NavLinks via dynamic id)
--   src/pages/Auth.tsx (Sign In button)
--   src/pages/Clients.tsx (Add Client button)
--   src/components/forms/ClientForm.tsx (form submit button)
--
-- This is the FIRST tagged batch (~12 elements). The remaining ~70
-- elements from the discovery list ship in PR #21+ as we tag more
-- pages (dashboard widgets, manifest viewer, driver mobile, etc.).
--
-- Idempotent: ON CONFLICT DO UPDATE so re-running this migration
-- updates labels/descriptions without duplicating rows.

BEGIN;

INSERT INTO public.tready_ui_map
  (element_id, label, description, page_path, location_hint, required_roles, required_app_state)
VALUES
  -- ---------- Sidebar nav (dynamic IDs from AppSidebar.tsx) ----------
  ('sidebar-dashboard', 'Dashboard link',
   'Sidebar nav item that takes the user to the main dashboard with today''s stats.',
   '*', 'left sidebar, top section',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('sidebar-clients', 'Clients link',
   'Sidebar nav item that takes the user to the clients list page.',
   '*', 'left sidebar, top section',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  ('sidebar-routes', 'Routes link',
   'Sidebar nav item that takes the user to today''s scheduled pickups + assigned drivers.',
   '*', 'left sidebar, Scheduling section',
   ARRAY['admin','ops_manager','dispatcher']::app_role[], NULL),

  ('sidebar-outbound-schedule', 'Outbound link',
   'Sidebar nav item for the outbound delivery schedule.',
   '*', 'left sidebar, Scheduling section',
   ARRAY['admin','ops_manager','dispatcher']::app_role[], NULL),

  ('sidebar-employees', 'Employees link',
   'Sidebar nav item to manage staff (drivers, dispatchers, ops managers).',
   '*', 'left sidebar, top section',
   ARRAY['admin']::app_role[], NULL),

  ('sidebar-settings', 'Settings link',
   'Sidebar nav item for tenant configuration.',
   '*', 'left sidebar, Account section (bottom)',
   ARRAY['admin','ops_manager']::app_role[], NULL),

  ('sidebar-integrations', 'Integrations link',
   'Sidebar nav item for connecting Stripe, QuickBooks, Zapier.',
   '*', 'left sidebar, Account section (bottom)',
   ARRAY['admin']::app_role[], NULL),

  ('sidebar-analytics', 'Analytics link',
   'Sidebar nav item for analytics and reporting dashboards.',
   '*', 'left sidebar, Reporting section',
   ARRAY['admin','ops_manager']::app_role[], NULL),

  ('sidebar-compliance-reports', 'Compliance Reports link',
   'Sidebar nav item to generate state-compliance reports for tire transport / EGLE / TCEQ / etc.',
   '*', 'left sidebar, Reporting section',
   ARRAY['admin','ops_manager']::app_role[], NULL),

  ('sidebar-driver-dashboard', 'Driver Dashboard link',
   'Sidebar nav item for drivers — shows today''s assignments and recent manifests.',
   '*', 'left sidebar, Driver Portal section',
   ARRAY['driver']::app_role[], NULL),

  -- ---------- Auth ----------
  ('auth-sign-in-button', 'Sign In button',
   'Submits the email + password and authenticates the user. Lands them on /dashboard (admin/ops/dispatch/sales) or /driver/dashboard (driver) or /client-portal (client).',
   '/auth', 'centered card, below the email + password fields',
   ARRAY['admin','ops_manager','dispatcher','driver','sales','client','hauler','viewer']::app_role[], NULL),

  -- ---------- Clients page ----------
  ('clients-add-button', 'Add Client button',
   'Opens the New Client dialog where the user fills in company name, contact, address, pricing tier.',
   '/clients', 'top-right of the Clients page header',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),

  -- ---------- Client form ----------
  ('client-form-submit', 'Client form submit button',
   'Saves the new client (or updates an existing one). Disabled while saving.',
   '/clients', 'inside the Add/Edit Client dialog, bottom-right',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL)

ON CONFLICT (element_id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  page_path = EXCLUDED.page_path,
  location_hint = EXCLUDED.location_hint,
  required_roles = EXCLUDED.required_roles,
  required_app_state = EXCLUDED.required_app_state,
  updated_at = now();

COMMIT;

-- Verification:
-- SELECT element_id, page_path, label FROM tready_ui_map ORDER BY element_id;
-- Expected: 13 rows
