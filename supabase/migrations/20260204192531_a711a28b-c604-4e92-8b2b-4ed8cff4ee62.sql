-- Add outbound tracking columns to manifests table
ALTER TABLE manifests 
  ADD COLUMN IF NOT EXISTS direction text DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  ADD COLUMN IF NOT EXISTS destination_entity_id uuid REFERENCES entities(id),
  ADD COLUMN IF NOT EXISTS origin_entity_id uuid REFERENCES entities(id);

-- Index for fast outbound queries
CREATE INDEX IF NOT EXISTS idx_manifests_direction ON manifests(direction) WHERE direction = 'outbound';

-- Index for destination/origin lookups
CREATE INDEX IF NOT EXISTS idx_manifests_destination_entity ON manifests(destination_entity_id) WHERE destination_entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_manifests_origin_entity ON manifests(origin_entity_id) WHERE origin_entity_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN manifests.direction IS 'inbound = material coming IN to facility, outbound = material going OUT to processor';
COMMENT ON COLUMN manifests.destination_entity_id IS 'For outbound: the processor receiving the material (e.g., NTech)';
COMMENT ON COLUMN manifests.origin_entity_id IS 'For outbound: the facility sending the material (e.g., BSG)';