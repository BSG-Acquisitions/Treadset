-- Ensure organization-level rates exist for the active org used by analytics
INSERT INTO organization_settings (id, name, default_pte_rate, default_otr_rate, default_tractor_rate)
VALUES ('ba2e9dc3-ecc6-4b73-963b-efe668a03d73', 'Default Org Settings', 2.75, 150.00, 35.00)
ON CONFLICT (id) DO UPDATE SET 
  default_pte_rate = EXCLUDED.default_pte_rate,
  default_otr_rate = EXCLUDED.default_otr_rate,
  default_tractor_rate = EXCLUDED.default_tractor_rate,
  name = COALESCE(organization_settings.name, EXCLUDED.name);