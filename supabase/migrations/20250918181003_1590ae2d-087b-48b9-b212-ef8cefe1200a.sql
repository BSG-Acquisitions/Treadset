-- Comprehensive Performance Optimization Migration
-- This addresses the most common performance issues in Supabase databases

-- 1. Add missing primary keys (critical for performance)
-- Most tables should already have UUID primary keys, but let's ensure they exist

-- 2. Add performance indexes for foreign key columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pickups_client_id ON public.pickups(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pickups_location_id ON public.pickups(location_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pickups_organization_id ON public.pickups(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pickups_manifest_id ON public.pickups(manifest_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pickups_pricing_tier_id ON public.pickups(pricing_tier_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_pickup_id ON public.assignments(pickup_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_vehicle_id ON public.assignments(vehicle_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_driver_id ON public.assignments(driver_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_hauler_id ON public.assignments(hauler_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_organization_id ON public.assignments(organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_client_id ON public.locations(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_organization_id ON public.locations(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_pricing_tier_id ON public.locations(pricing_tier_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_organization_id ON public.clients(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_pricing_tier_id ON public.clients(pricing_tier_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manifests_client_id ON public.manifests(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manifests_pickup_id ON public.manifests(pickup_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manifests_organization_id ON public.manifests(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manifests_driver_id ON public.manifests(driver_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_organization_id ON public.invoices(organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_items_pickup_id ON public.invoice_items(pickup_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_organization_id ON public.payments(organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_organization_id ON public.vehicles(organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_org_roles_user_id ON public.user_organization_roles(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_org_roles_org_id ON public.user_organization_roles(organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_summaries_client_id ON public.client_summaries(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_summaries_organization_id ON public.client_summaries(organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dropoffs_dropoff_customer_id ON public.dropoffs(dropoff_customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dropoffs_organization_id ON public.dropoffs(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dropoffs_manifest_id ON public.dropoffs(manifest_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dropoff_customers_organization_id ON public.dropoff_customers(organization_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dropoff_customers_pricing_tier_id ON public.dropoff_customers(pricing_tier_id);

-- 3. Add performance indexes for commonly filtered/sorted columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pickups_pickup_date ON public.pickups(pickup_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pickups_status ON public.pickups(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pickups_created_at ON public.pickups(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_scheduled_date ON public.assignments(scheduled_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_status ON public.assignments(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_is_active ON public.clients(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_company_name ON public.clients(company_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_email ON public.clients(email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manifests_status ON public.manifests(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manifests_signed_at ON public.manifests(signed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manifests_created_at ON public.manifests(created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_issued_date ON public.invoices(issued_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_events_created_at ON public.audit_events(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_events_table_name ON public.audit_events(table_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_events_action ON public.audit_events(action);

-- 4. Add composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pickups_client_date ON public.pickups(client_id, pickup_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pickups_org_status ON public.pickups(organization_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manifests_org_status ON public.manifests(organization_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_driver_date ON public.assignments(driver_id, scheduled_date);

-- 5. Add indexes for text search performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_company_name_trgm ON public.clients USING gin(company_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_contact_name_trgm ON public.clients USING gin(contact_name gin_trgm_ops);

-- Enable pg_trgm extension for text search if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 6. Add partial indexes for active records only (more efficient)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_active_only ON public.clients(organization_id, created_at) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vehicles_active_only ON public.vehicles(organization_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_locations_active_only ON public.locations(client_id, organization_id) WHERE is_active = true;

-- 7. Performance optimization for large audit table
-- Partition audit_events by date for better performance (if supported)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_events_org_date ON public.audit_events(organization_id, created_at);

-- 8. Add indexes for date range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_summaries_year_month ON public.client_summaries(year, month);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_summaries_org_year ON public.client_summaries(organization_id, year, month);

-- Note: Using CONCURRENTLY to avoid blocking operations during index creation
-- This is essential for production databases to maintain availability