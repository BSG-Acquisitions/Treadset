-- Build 5.18 — seed the Driver Manifest Wizard for the deep walkthrough.
--
-- Pairs with data-tready-id additions on:
--   src/pages/DriverManifests.tsx                          (driver-manifests-new-button)
--   src/components/driver/DriverManifestCreationWizard.tsx (generator-search,
--                                                           hauler-select, pte-off-rim-input,
--                                                           pte-off-rim-rate, payment-method-cash,
--                                                           generator-print-name, generator-signature-pad,
--                                                           hauler-print-name, hauler-signature-pad,
--                                                           wizard-next, wizard-submit)
-- required_app_state intentionally NULL — scripted tour bypasses chat-path gating.

BEGIN;

INSERT INTO public.tready_ui_map
  (element_id, label, description, page_path, location_hint, required_roles, required_app_state)
VALUES
  ('driver-manifests-new-button', 'New Manifest button',
   'Top-right button on the Driver Manifests page that opens the 7-step manifest wizard in standalone mode at /driver/manifest/new.',
   '/driver/manifests', 'top-right of page header, primary button',
   ARRAY['admin','driver']::app_role[], NULL),

  ('manifest-generator-search', 'Generator (client) searchable dropdown',
   'Standalone-mode searchable dropdown to pick the client generating the tires. Required to advance step 1.',
   '/driver/manifest/new', 'wizard step 1 — Generator card, first field',
   ARRAY['admin','driver']::app_role[], NULL),

  ('manifest-hauler-select', 'Hauler selector',
   'Required hauler-company dropdown — your company. Wizard blocks advance past step 1 until a complete hauler is selected.',
   '/driver/manifest/new', 'wizard step 1 — Hauler card, single Select',
   ARRAY['admin','driver']::app_role[], NULL),

  ('manifest-pte-off-rim-input', 'Off-rim passenger tire count',
   'Tire count field for passenger off-rim tires. At least one tire-count field must be > 0 to advance step 2.',
   '/driver/manifest/new', 'wizard step 2 — PTE card, left input',
   ARRAY['admin','driver']::app_role[], NULL),

  ('manifest-pte-off-rim-rate', 'Passenger off-rim preset rate Select',
   'Per-tire rate selector for passenger off-rim tires. Wizard requires a > $0 rate for every tire type with a count > 0.',
   '/driver/manifest/new', 'wizard step 3 — first pricing card preset dropdown',
   ARRAY['admin','driver']::app_role[], NULL),

  ('manifest-payment-method-cash', 'Cash payment method card',
   'Selects CASH as the payment method. Payment status will mark COMPLETED on submit.',
   '/driver/manifest/new', 'wizard step 4 — first of five payment-method cards',
   ARRAY['admin','driver']::app_role[], NULL),

  ('manifest-generator-print-name', 'Generator print-name field',
   'Print name of the person at the generator client who is signing — individual, not company. Required before step 5 advance.',
   '/driver/manifest/new', 'wizard step 5 — Generator Signature card, top input',
   ARRAY['admin','driver']::app_role[], NULL),

  ('manifest-generator-signature-pad', 'Generator signature canvas',
   'Drawable signature pad for the generator. Uploaded to manifests/signatures/{ts}-generator.png on Next.',
   '/driver/manifest/new', 'wizard step 5 — Generator Signature card, signature box',
   ARRAY['admin','driver']::app_role[], NULL),

  ('manifest-hauler-print-name', 'Hauler print-name field',
   'Print name of the driver signing as hauler. Required before step 5 advance.',
   '/driver/manifest/new', 'wizard step 5 — Hauler Signature card, top input',
   ARRAY['admin','driver']::app_role[], NULL),

  ('manifest-hauler-signature-pad', 'Hauler signature canvas',
   'Drawable signature pad for the hauler/driver. Uploaded to manifests/signatures/{ts}-hauler.png on Next.',
   '/driver/manifest/new', 'wizard step 5 — Hauler Signature card, signature box',
   ARRAY['admin','driver']::app_role[], NULL),

  ('manifest-wizard-next', 'Wizard Next button',
   'Advances the manifest wizard one step. Per-step validation (hauler, tire counts, rates, payment, signatures) blocks invalid advances with a toast.',
   '/driver/manifest/new', 'wizard footer, right side',
   ARRAY['admin','driver']::app_role[], NULL),

  ('manifest-wizard-submit', 'Create Manifest submit button',
   'Final submit on review step. Triggers manifest insert, PDF generation, signature upload, and auto-email to the client.',
   '/driver/manifest/new', 'wizard footer on the review step, right side',
   ARRAY['admin','driver']::app_role[], NULL)
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
