-- Drop duplicate organization_id index on location_pricing_overrides
DROP INDEX IF EXISTS idx_location_pricing_overrides_org;
-- Keep idx_location_pricing_overrides_organization_id