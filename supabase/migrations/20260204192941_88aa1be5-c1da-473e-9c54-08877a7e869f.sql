-- Add material tracking columns to manifests for outbound workflows
ALTER TABLE manifests 
  ADD COLUMN IF NOT EXISTS material_form text CHECK (material_form IN ('whole_off_rim', 'on_rim', 'semi', 'otr', 'shreds', 'crumb', 'baled', 'tdf')),
  ADD COLUMN IF NOT EXISTS total_pte integer,
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS receiver_name text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Comment for documentation
COMMENT ON COLUMN manifests.material_form IS 'Material type for outbound manifests';
COMMENT ON COLUMN manifests.total_pte IS 'Total PTE count for the manifest';
COMMENT ON COLUMN manifests.driver_name IS 'Driver name for display purposes';
COMMENT ON COLUMN manifests.receiver_name IS 'Receiver representative name for outbound manifests';