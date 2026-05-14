-- Build 5.12 — seed the Add Client form fields for the deep walkthrough
--
-- Pairs with data-tready-id additions on FormItem wrappers in
-- src/components/forms/ClientForm.tsx

BEGIN;

INSERT INTO public.tready_ui_map
  (element_id, label, description, page_path, location_hint, required_roles, required_app_state)
VALUES
  ('clientform-company-name', 'Company Name field',
   'First field in the Add Client dialog. The legal/working name of the tire-generating business.',
   '/clients', 'top-left of the form, required field',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),
  ('clientform-contact-name', 'Contact Name field',
   'Primary point of contact at the client. Optional but recommended.',
   '/clients', 'top-right of the form',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),
  ('clientform-email', 'Email field',
   'Contact email. Used for sending manifests + invoices automatically.',
   '/clients', 'second row left',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),
  ('clientform-phone', 'Phone field',
   'Contact phone. Format: 313-555-1234.',
   '/clients', 'second row right',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),
  ('clientform-address', 'Street Address field',
   'Pickup street address. Required for manifest generation.',
   '/clients', 'address section, full width',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),
  ('clientform-city', 'City field',
   'City. Required.',
   '/clients', 'address section, second row left',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),
  ('clientform-state', 'State field',
   '2-letter state code. Required. Determines the compliance manifest template.',
   '/clients', 'address section, second row middle',
   ARRAY['admin','ops_manager','dispatcher','sales']::app_role[], NULL),
  ('clientform-zip', 'ZIP Code field',
   'ZIP code. Required.',
   '/clients', 'address section, second row right',
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
