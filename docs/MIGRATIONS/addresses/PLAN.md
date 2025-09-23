# Address Source of Truth Migration Plan

## ⚠️ MUTATION RISK - DO NOT APPLY

This document outlines the migration strategy to consolidate address sources. **DO NOT EXECUTE** - This is a plan only.

## Current State Analysis

### Address Sources (Problematic Duplication)
1. **locations table**: Primary address for pickup points
2. **clients table**: Fallback address when no location specified
3. **Scattered logic**: UI components make inconsistent choices

### Issues to Resolve
- Inconsistent address resolution across Admin vs Driver flows  
- Data drift between client and location addresses
- Missing foreign key constraints
- Performance impact of cascading queries

## Target Architecture

### Canonical Source: `locations` table (preferred)
**Rationale**: Locations represent actual pickup points, clients are billing entities

### Fallback Chain
1. `locations.address` → Primary address
2. `clients.address` → Fallback if no location  
3. Error state → Require address before manifest creation

## Migration Steps (PLAN ONLY)

### Phase 1: Data Consolidation
```sql
-- MUTATION RISK - DO NOT APPLY
-- Create consolidated address staging table
CREATE TABLE address_migration_staging AS
SELECT 
  pickup_id,
  COALESCE(l.physical_address, c.mailing_address) as canonical_address,
  COALESCE(l.city, c.city) as canonical_city,
  COALESCE(l.state, c.state) as canonical_state,
  COALESCE(l.zip, c.zip) as canonical_zip,
  l.id as location_id,
  c.id as client_id,
  CASE 
    WHEN l.physical_address IS NOT NULL THEN 'location'
    WHEN c.mailing_address IS NOT NULL THEN 'client_fallback'
    ELSE 'missing'
  END as source_priority
FROM pickups p
JOIN clients c ON p.client_id = c.id  
LEFT JOIN locations l ON p.location_id = l.id
WHERE p.created_at >= '2025-01-01';

-- Validation: Check for missing addresses
SELECT source_priority, COUNT(*) 
FROM address_migration_staging 
GROUP BY source_priority;
```

### Phase 2: Backfill Missing Data
```sql
-- MUTATION RISK - DO NOT APPLY
-- Update locations with missing addresses from client data
UPDATE locations l
SET 
  physical_address = c.mailing_address,
  city = c.city,
  state = c.state,
  zip = c.zip,
  updated_at = NOW()
FROM clients c
WHERE l.client_id = c.id
  AND l.physical_address IS NULL
  AND c.mailing_address IS NOT NULL;

-- Add address completeness constraint
ALTER TABLE locations 
ADD CONSTRAINT locations_address_complete 
CHECK (
  physical_address IS NOT NULL 
  AND city IS NOT NULL 
  AND state IS NOT NULL 
  AND zip IS NOT NULL
);
```

### Phase 3: Schema Enhancement
```sql
-- MUTATION RISK - DO NOT APPLY
-- Add foreign key constraints for data integrity
ALTER TABLE pickups 
ADD CONSTRAINT fk_pickups_location_address 
FOREIGN KEY (location_id) REFERENCES locations(id) 
ON DELETE RESTRICT;

-- Add performance indexes
CREATE INDEX idx_locations_address_lookup 
ON locations (client_id, physical_address) 
WHERE physical_address IS NOT NULL;

CREATE INDEX idx_pickups_address_resolution
ON pickups (location_id, client_id, scheduled_date);
```

### Phase 4: Application Layer Updates
```sql
-- MUTATION RISK - DO NOT APPLY
-- Create read-optimized view for post-migration shape
CREATE VIEW pickup_addresses AS
SELECT 
  p.id as pickup_id,
  p.manifest_id,
  COALESCE(l.physical_address, c.mailing_address) as address,
  COALESCE(l.city, c.city) as city,
  COALESCE(l.state, c.state) as state, 
  COALESCE(l.zip, c.zip) as zip,
  CASE 
    WHEN l.physical_address IS NOT NULL THEN 'location'
    ELSE 'client_fallback'
  END as address_source
FROM pickups p
JOIN clients c ON p.client_id = c.id
LEFT JOIN locations l ON p.location_id = l.id;

-- Grant appropriate permissions
GRANT SELECT ON pickup_addresses TO app_role;
```

## Rollback Procedure

### Immediate Rollback (if migration fails)
```sql
-- MUTATION RISK - DO NOT APPLY
-- 1. Drop constraints
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_address_complete;
ALTER TABLE pickups DROP CONSTRAINT IF EXISTS fk_pickups_location_address;

-- 2. Restore from snapshot
-- (Assumes database snapshot taken before migration)
pg_restore --clean --if-exists --single-transaction address_snapshot.dump

-- 3. Drop staging tables
DROP TABLE IF EXISTS address_migration_staging;
DROP VIEW IF EXISTS pickup_addresses;
```

### Data Snapshot Procedure (Pre-Migration)
```bash
# MUTATION RISK - DO NOT APPLY
# Create data snapshot before migration
pg_dump --data-only --table=locations --table=clients --table=pickups \
  -f address_snapshot.dump $DATABASE_URL

# Verify snapshot
pg_restore --list address_snapshot.dump | grep -E 'locations|clients|pickups'
```

## Risk Assessment

### High Risk Items
- **Foreign key constraints**: May prevent valid operations if data is inconsistent
- **Address completeness constraint**: Could block existing workflows
- **Performance impact**: New indexes need monitoring

### Medium Risk Items  
- **Data backfill**: Large table updates may cause locks
- **Application compatibility**: addressResolver must handle new view

### Low Risk Items
- **Read view creation**: Non-destructive addition
- **Index creation**: Can be done online

## Validation Tests

### Pre-Migration Validation
```sql
-- Check for address conflicts
SELECT COUNT(*) as conflicts
FROM pickups p
JOIN clients c ON p.client_id = c.id
LEFT JOIN locations l ON p.location_id = l.id
WHERE l.physical_address != c.mailing_address
  AND l.physical_address IS NOT NULL
  AND c.mailing_address IS NOT NULL;

-- Estimate missing data scope
SELECT 
  COUNT(*) as total_pickups,
  COUNT(l.physical_address) as have_location_address,
  COUNT(c.mailing_address) as have_client_address,
  COUNT(*) - COUNT(COALESCE(l.physical_address, c.mailing_address)) as completely_missing
FROM pickups p
JOIN clients c ON p.client_id = c.id
LEFT JOIN locations l ON p.location_id = l.id;
```

### Post-Migration Validation
```sql
-- Verify no data loss
SELECT 
  COUNT(*) as total_after_migration,
  COUNT(address) as complete_addresses,
  COUNT(CASE WHEN address_source = 'location' THEN 1 END) as from_locations,
  COUNT(CASE WHEN address_source = 'client_fallback' THEN 1 END) as from_clients
FROM pickup_addresses;

-- Performance test
EXPLAIN ANALYZE 
SELECT * FROM pickup_addresses 
WHERE pickup_id IN (SELECT id FROM pickups ORDER BY created_at DESC LIMIT 100);
```

## Timeline Estimate

- **Phase 1 (Analysis)**: 2 days - Data quality assessment
- **Phase 2 (Backfill)**: 1 day - Update missing location addresses  
- **Phase 3 (Schema)**: 1 day - Constraints and indexes
- **Phase 4 (App Layer)**: 2 days - View creation and testing
- **Validation**: 1 day - End-to-end testing

**Total: 7 days** (with rollback buffer)

## Success Criteria

- [ ] Zero pickup records without resolvable addresses
- [ ] Performance maintains <100ms for address resolution queries
- [ ] addressResolver consistently returns same address for same pickup
- [ ] All existing manifests can still access their historical addresses
- [ ] Rollback procedure tested and validated

---
**⚠️ CRITICAL**: This plan requires approval and staging validation before production execution  
**Rollback Time**: < 30 minutes with pre-created snapshot  
**Risk Level**: MEDIUM (data integrity changes, performance impact)