-- Build 5.15 — seed the Process Drop-off wizard for the deep walkthrough.
--
-- Pairs with data-tready-id additions on:
--   src/pages/Dropoffs.tsx                              (dropoffs-process-button)
--   src/components/dropoffs/ProcessDropoffDialog.tsx    (generator/receiver/pte/revenue/next/submit/hauler-sig)
--   src/components/dropoffs/DropoffSignatureStep.tsx    (signature-print-name)

BEGIN;

INSERT INTO public.tready_ui_map
  (element_id, label, description, page_path, location_hint, required_roles, required_app_state)
VALUES
  ('dropoffs-process-button', 'Process Drop-off button',
   'Opens the 5-step Process Drop-off wizard from the Drop-offs page.',
   '/dropoffs', 'top-right of the page header, primary button',
   ARRAY['admin','ops_manager','sales']::app_role[], NULL),

  ('dropoff-generator-select', 'Generator (Tire Source) selector',
   'Searchable dropdown to pick the client generating the tires. Required unless walk-in mode.',
   '/dropoffs', 'wizard step 1 — Manifest Parties card, first dropdown',
   ARRAY['admin','ops_manager','sales']::app_role[],
   NULL),

  ('dropoff-receiver-select', 'Receiver selector',
   'Dropdown to pick the facility receiving the tires.',
   '/dropoffs', 'wizard step 1 — Manifest Parties card, third dropdown',
   ARRAY['admin','ops_manager','sales']::app_role[],
   NULL),

  ('dropoff-pte-input', 'Passenger Tire count field',
   'Number of passenger tires (1 tire = 1 PTE). At least one tire-count field must be > 0.',
   '/dropoffs', 'wizard step 1 — Tire Counts row, left',
   ARRAY['admin','ops_manager','sales']::app_role[],
   NULL),

  ('dropoff-revenue-input', 'Amount Charged field',
   'Dollar amount charged for this drop-off. Required, must be > 0.',
   '/dropoffs', 'wizard step 1 — Amount Charged card',
   ARRAY['admin','ops_manager','sales']::app_role[],
   NULL),

  ('dropoff-next-button', 'Wizard Next button',
   'Advances to the next wizard step. Disabled until the current step is valid.',
   '/dropoffs', 'wizard footer, bottom-right',
   ARRAY['admin','ops_manager','sales']::app_role[],
   NULL),

  ('dropoff-signature-print-name', 'Signature Print Name field',
   'Print name of whoever is signing the current step (generator, hauler, or receiver).',
   '/dropoffs', 'wizard signature steps — top of the signature card',
   ARRAY['admin','ops_manager','sales']::app_role[],
   NULL),

  ('dropoff-hauler-sig-toggle', 'Hauler Signature toggle',
   'Switch controlling whether the hauler signature is captured. Off by default — hauler sig is optional.',
   '/dropoffs', 'wizard step 3 — Hauler Signature header, right side',
   ARRAY['admin','ops_manager','sales']::app_role[],
   NULL),

  ('dropoff-submit-button', 'Complete Drop-off submit button',
   'Final submit on the review step. Fires manifest generation and uploads signatures.',
   '/dropoffs', 'wizard footer on the review step, bottom-right',
   ARRAY['admin','ops_manager','sales']::app_role[],
   NULL)
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
