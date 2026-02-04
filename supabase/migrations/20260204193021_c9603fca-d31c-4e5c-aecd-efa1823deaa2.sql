-- Make client_id nullable for outbound manifests (which don't have a traditional client)
ALTER TABLE manifests ALTER COLUMN client_id DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN manifests.client_id IS 'Client ID for inbound manifests. NULL for outbound manifests which use origin_entity_id and destination_entity_id instead';