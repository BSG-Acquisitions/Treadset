-- Build 5.20 — seed the Compliance Reports flow for deep tour #6.
--
-- Pairs with data-tready-id additions on:
--   src/components/TopNav.tsx                  (topnav-reports-compliance)
--   src/pages/StateComplianceReports.tsx       (page-header, year-select,
--                                                totals-row, tabs-list,
--                                                export-tab, export-csv, export-pdf)
-- topnav-reports is already seeded in 20260514160000_tready_topnav_seed.sql.

BEGIN;

INSERT INTO public.tready_ui_map
  (element_id, label, description, page_path, location_hint, required_roles, required_app_state)
VALUES
  ('topnav-reports-compliance', 'Compliance Reports dropdown item',
   'Inside the Reports top-nav dropdown — the State Compliance Reports link.',
   '*', 'top nav, Reports dropdown, third item',
   ARRAY['admin','ops_manager','viewer']::app_role[], NULL),

  ('compliance-page-header', 'State Compliance Reports H1',
   'The H1 on the Compliance Reports page. Confirms the user landed on the right view.',
   '/reports/compliance', 'top-left of the page',
   ARRAY['admin','ops_manager']::app_role[], NULL),

  ('compliance-year-select', 'Reporting year selector',
   'Year dropdown that drives every metric on this page. Default current year, last 5 years available.',
   '/reports/compliance', 'top-right of the page header',
   ARRAY['admin','ops_manager']::app_role[], NULL),

  ('compliance-totals-row', 'Totals row of overview cards',
   'Five overview cards showing PTEs In / Tons In / Tons Out / Counties / Processed totals for the selected year.',
   '/reports/compliance', 'main body of the page, below the header',
   ARRAY['admin','ops_manager']::app_role[], NULL),

  ('compliance-tabs-list', 'Compliance Report tabs',
   'Eight tabs that slice the report — Overview, Inbound, Outbound, Counties, Processing, Sites, State Totals, Export.',
   '/reports/compliance', 'below the totals row',
   ARRAY['admin','ops_manager']::app_role[], NULL),

  ('compliance-export-tab', 'Export tab',
   'Switches the report view to the Export pane (CSV + PDF buttons + submit-for-compliance).',
   '/reports/compliance', 'rightmost tab in the tabs row',
   ARRAY['admin','ops_manager']::app_role[], NULL),

  ('compliance-export-csv', 'Export CSV button',
   'Generates a CSV export of the year''s compliance data.',
   '/reports/compliance', 'Export pane — left button',
   ARRAY['admin','ops_manager']::app_role[], NULL),

  ('compliance-export-pdf', 'Export PDF button',
   'Generates a PDF export of the year''s compliance data.',
   '/reports/compliance', 'Export pane — right button',
   ARRAY['admin','ops_manager']::app_role[], NULL)
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
