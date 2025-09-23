# Database Migration Plans for Hardening

⚠️ **MUTATION RISK — DO NOT APPLY AUTOMATICALLY** ⚠️

These migration plans support the hardening PRs. Review and apply manually in staging first.

## PR#7 - Idempotency Records Table

### Migration: Create Idempotency Records

```sql
-- Create idempotency records table for duplicate prevention
CREATE TABLE public.idempotency_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  resource_id TEXT,
  user_id UUID,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);

-- Unique constraint prevents true duplicates
CREATE UNIQUE INDEX idx_idempotency_key_operation 
ON public.idempotency_records(idempotency_key, operation);

-- Index for cleanup of expired records
CREATE INDEX idx_idempotency_expires_at 
ON public.idempotency_records(expires_at);

-- Index for user queries
CREATE INDEX idx_idempotency_user_id 
ON public.idempotency_records(user_id);

-- RLS policy
ALTER TABLE public.idempotency_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own idempotency records"
ON public.idempotency_records
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text);

-- Cleanup function for expired records
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_records()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.idempotency_records 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Schedule cleanup (requires pg_cron extension - add manually if needed)
-- SELECT cron.schedule('cleanup-idempotency', '0 */6 * * *', 'SELECT cleanup_expired_idempotency_records();');
```

### Migration: Add Unique Constraint to Manifests

```sql
-- Add unique constraint for manifest idempotency
-- This prevents duplicate manifests from same pickup/client/date combination

ALTER TABLE public.manifests 
ADD COLUMN unique_key TEXT;

-- Populate existing records with generated keys
UPDATE public.manifests 
SET unique_key = CONCAT(
  client_id, '-', 
  COALESCE(pickup_id, 'no-pickup'), '-',
  DATE(created_at)
)
WHERE unique_key IS NULL;

-- Make column required and add constraint
ALTER TABLE public.manifests 
ALTER COLUMN unique_key SET NOT NULL;

CREATE UNIQUE INDEX idx_manifests_unique_key 
ON public.manifests(unique_key);

-- Add trigger to auto-generate unique keys for new records
CREATE OR REPLACE FUNCTION generate_manifest_unique_key()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.unique_key IS NULL THEN
    NEW.unique_key := CONCAT(
      NEW.client_id, '-',
      COALESCE(NEW.pickup_id, 'no-pickup'), '-',
      DATE(NEW.created_at)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_manifest_unique_key
BEFORE INSERT ON public.manifests
FOR EACH ROW
EXECUTE FUNCTION generate_manifest_unique_key();
```

## PR#8 - Performance Indexes

### Migration: Add Performance Indexes

```sql
-- Index for pickup queries by client and date (dashboard N+1 fix)
CREATE INDEX CONCURRENTLY idx_pickups_client_date_performance
ON public.pickups(client_id, pickup_date, status)
INCLUDE (pte_count, computed_revenue);

-- Index for manifest queries by pickup (route optimization)  
CREATE INDEX CONCURRENTLY idx_manifests_pickup_performance
ON public.manifests(pickup_id, status)
INCLUDE (created_at, manifest_number);

-- Index for assignment queries by driver and date (route planning)
CREATE INDEX CONCURRENTLY idx_assignments_driver_date_performance  
ON public.assignments(driver_id, scheduled_date, status)
INCLUDE (pickup_id, sequence_order);

-- Index for client lookup with activity filter (dashboard)
CREATE INDEX CONCURRENTLY idx_clients_org_active_performance
ON public.clients(organization_id, is_active, last_pickup_at)
INCLUDE (company_name, lifetime_revenue, type);

-- Index for location queries with geocoding (route optimization)
CREATE INDEX CONCURRENTLY idx_locations_client_geo_performance
ON public.locations(client_id, is_active) 
INCLUDE (latitude, longitude, address);

-- Partial index for active vehicles only (fleet status)
CREATE INDEX CONCURRENTLY idx_vehicles_active_only
ON public.vehicles(organization_id, name)
WHERE is_active = true;

-- Composite index for audit queries (observability)
CREATE INDEX CONCURRENTLY idx_audit_events_org_table_date
ON public.audit_events(organization_id, table_name, created_at DESC);
```

### Migration: Add Materialized View for Dashboard

```sql
-- Materialized view for dashboard performance (refresh every 15 minutes)
CREATE MATERIALIZED VIEW public.dashboard_summary AS
SELECT 
  c.organization_id,
  c.id as client_id,
  c.company_name,
  c.is_active,
  c.lifetime_revenue,
  c.last_pickup_at,
  c.type,
  COUNT(p.id) as total_pickups,
  COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_pickups,
  COUNT(CASE WHEN p.pickup_date = CURRENT_DATE THEN 1 END) as today_pickups,
  COUNT(CASE WHEN m.status != 'COMPLETED' THEN 1 END) as outstanding_manifests,
  MAX(p.pickup_date) as last_pickup_date,
  SUM(CASE WHEN p.pickup_date = CURRENT_DATE THEN p.pte_count ELSE 0 END) as today_pte_count,
  SUM(CASE WHEN p.pickup_date = CURRENT_DATE THEN p.computed_revenue ELSE 0 END) as today_revenue
FROM public.clients c
LEFT JOIN public.pickups p ON p.client_id = c.id
LEFT JOIN public.manifests m ON m.client_id = c.id
WHERE c.is_active = true
GROUP BY c.organization_id, c.id, c.company_name, c.is_active, 
         c.lifetime_revenue, c.last_pickup_at, c.type;

-- Index on materialized view
CREATE UNIQUE INDEX idx_dashboard_summary_pk 
ON public.dashboard_summary(organization_id, client_id);

CREATE INDEX idx_dashboard_summary_active
ON public.dashboard_summary(organization_id, is_active, today_pickups DESC);

-- Function to refresh dashboard data  
CREATE OR REPLACE FUNCTION refresh_dashboard_summary()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.dashboard_summary;
  
  -- Log refresh for monitoring
  INSERT INTO public.audit_events (
    organization_id,
    table_name,
    action,
    record_id,
    new_data
  ) VALUES (
    NULL, -- System operation
    'dashboard_summary',
    'REFRESH', 
    gen_random_uuid(),
    jsonb_build_object('refreshed_at', NOW())
  );
END;
$$;

-- Schedule refresh (requires pg_cron - add manually)
-- SELECT cron.schedule('refresh-dashboard', '*/15 * * * *', 'SELECT refresh_dashboard_summary();');
```

## PR#9 - AcroForm Field Mappings  

### Migration: Add AcroForm Mapping Config

```sql
-- Table to store field mappings for different AcroForm templates
CREATE TABLE public.acroform_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  domain_field TEXT NOT NULL,
  acroform_field TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'signature', 'checkbox')),
  transform_function TEXT, -- Optional data transformation
  is_required BOOLEAN DEFAULT false,
  validation_regex TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_acroform_mappings_template 
ON public.acroform_field_mappings(template_name);

CREATE UNIQUE INDEX idx_acroform_mappings_unique
ON public.acroform_field_mappings(template_name, domain_field, acroform_field);

-- RLS (admin-only configuration)
ALTER TABLE public.acroform_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AcroForm mappings"
ON public.acroform_field_mappings
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_organization_roles uo
  JOIN public.users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
  AND uo.role = 'admin'
));

-- Insert default mappings for Michigan template
INSERT INTO public.acroform_field_mappings (
  template_name, domain_field, acroform_field, field_type, is_required
) VALUES 
  ('Michigan_Manifest_AcroForm', 'generator.name', 'Generator_Name', 'text', true),
  ('Michigan_Manifest_AcroForm', 'generator.address', 'Generator_Address', 'text', true),
  ('Michigan_Manifest_AcroForm', 'generator.signature', 'Generator_Signature', 'signature', true),
  ('Michigan_Manifest_AcroForm', 'hauler.name', 'Hauler_Name', 'text', true),
  ('Michigan_Manifest_AcroForm', 'hauler.license', 'Hauler_License', 'text', true),
  ('Michigan_Manifest_AcroForm', 'hauler.signature', 'Hauler_Signature', 'signature', true),
  ('Michigan_Manifest_AcroForm', 'receiver.name', 'Receiver_Name', 'text', true),
  ('Michigan_Manifest_AcroForm', 'receiver.signature', 'Receiver_Signature', 'signature', true),
  ('Michigan_Manifest_AcroForm', 'calculated.total_pte', 'Total_PTE_Count', 'number', true),
  ('Michigan_Manifest_AcroForm', 'calculated.manifest_date', 'Manifest_Date', 'date', true);
```

## Deployment Instructions

1. **Staging First**: Apply all migrations in staging environment
2. **Test Load**: Run dashboard queries and PDF generation under load  
3. **Monitor Performance**: Verify query plans use new indexes
4. **Rollback Plan**: Keep DROP INDEX statements ready for each new index
5. **Production Window**: Apply during low-traffic period with monitoring

## Rollback Commands

```sql
-- Remove performance indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_pickups_client_date_performance;
DROP INDEX CONCURRENTLY IF EXISTS idx_manifests_pickup_performance;
DROP INDEX CONCURRENTLY IF EXISTS idx_assignments_driver_date_performance;
DROP INDEX CONCURRENTLY IF EXISTS idx_clients_org_active_performance;
DROP INDEX CONCURRENTLY IF EXISTS idx_locations_client_geo_performance;
DROP INDEX CONCURRENTLY IF EXISTS idx_vehicles_active_only;
DROP INDEX CONCURRENTLY IF EXISTS idx_audit_events_org_table_date;

-- Remove idempotency system
DROP TABLE IF EXISTS public.idempotency_records CASCADE;
ALTER TABLE public.manifests DROP COLUMN IF EXISTS unique_key CASCADE;

-- Remove dashboard materialized view
DROP MATERIALIZED VIEW IF EXISTS public.dashboard_summary CASCADE;

-- Remove AcroForm mappings
DROP TABLE IF EXISTS public.acroform_field_mappings CASCADE;
```

## Monitoring Post-Migration

After applying migrations, verify:

1. **Query Performance**: Check execution plans for dashboard queries
2. **Index Usage**: Monitor `pg_stat_user_indexes` for new indexes  
3. **Storage Impact**: Check table sizes with new indexes
4. **Idempotency**: Test duplicate submissions are properly handled
5. **AcroForm**: Verify PDF generation uses field mappings correctly

## Estimated Impact

- **Storage**: ~15-20% increase due to additional indexes
- **Write Performance**: Minimal impact (0-5% slower inserts)  
- **Read Performance**: 60-80% improvement on dashboard queries
- **Maintenance**: Auto-cleanup jobs reduce manual maintenance