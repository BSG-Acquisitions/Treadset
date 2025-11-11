-- Add missing indexes on foreign key columns for optimal query performance
-- This significantly improves JOIN operations and foreign key lookups

-- assignments table foreign keys
CREATE INDEX IF NOT EXISTS idx_assignments_driver_id ON public.assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_assignments_hauler_id ON public.assignments(hauler_id);
CREATE INDEX IF NOT EXISTS idx_assignments_pickup_id ON public.assignments(pickup_id);
CREATE INDEX IF NOT EXISTS idx_assignments_vehicle_id ON public.assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_assignments_organization_id ON public.assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assignments_scheduled_date ON public.assignments(scheduled_date);

-- ai_insights table
CREATE INDEX IF NOT EXISTS idx_ai_insights_organization_id ON public.ai_insights(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_generated_at ON public.ai_insights(generated_at);

-- ai_query_logs table
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_user_id ON public.ai_query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_organization_id ON public.ai_query_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_created_at ON public.ai_query_logs(created_at);

-- audit_events table
CREATE INDEX IF NOT EXISTS idx_audit_events_organization_id ON public.audit_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON public.audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_table_name ON public.audit_events(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON public.audit_events(created_at);

-- capacity_preview table
CREATE INDEX IF NOT EXISTS idx_capacity_preview_organization_id ON public.capacity_preview(organization_id);
CREATE INDEX IF NOT EXISTS idx_capacity_preview_forecast_date ON public.capacity_preview(forecast_date);

-- client_engagement table
CREATE INDEX IF NOT EXISTS idx_client_engagement_organization_id ON public.client_engagement(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_engagement_client_id ON public.client_engagement(client_id);

-- client_health_scores table
CREATE INDEX IF NOT EXISTS idx_client_health_scores_organization_id ON public.client_health_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_health_scores_client_id ON public.client_health_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_client_health_scores_risk_level ON public.client_health_scores(risk_level);

-- client_pickup_patterns table
CREATE INDEX IF NOT EXISTS idx_client_pickup_patterns_organization_id ON public.client_pickup_patterns(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_pickup_patterns_client_id ON public.client_pickup_patterns(client_id);
CREATE INDEX IF NOT EXISTS idx_client_pickup_patterns_frequency ON public.client_pickup_patterns(frequency);

-- client_pricing_overrides table
CREATE INDEX IF NOT EXISTS idx_client_pricing_overrides_client_id ON public.client_pricing_overrides(client_id);
CREATE INDEX IF NOT EXISTS idx_client_pricing_overrides_organization_id ON public.client_pricing_overrides(organization_id);

-- client_risk_scores table
CREATE INDEX IF NOT EXISTS idx_client_risk_scores_organization_id ON public.client_risk_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_risk_scores_client_id ON public.client_risk_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_client_risk_scores_risk_level ON public.client_risk_scores(risk_level);

-- client_summaries table
CREATE INDEX IF NOT EXISTS idx_client_summaries_client_id ON public.client_summaries(client_id);
CREATE INDEX IF NOT EXISTS idx_client_summaries_organization_id ON public.client_summaries(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_summaries_year_month ON public.client_summaries(year, month);

-- client_workflows table
CREATE INDEX IF NOT EXISTS idx_client_workflows_client_id ON public.client_workflows(client_id);
CREATE INDEX IF NOT EXISTS idx_client_workflows_organization_id ON public.client_workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_workflows_status ON public.client_workflows(status);
CREATE INDEX IF NOT EXISTS idx_client_workflows_next_contact_date ON public.client_workflows(next_contact_date);

-- clients table
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_pricing_tier_id ON public.clients(pricing_tier_id);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients(is_active);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON public.clients(company_name);

-- data_quality_flags table
CREATE INDEX IF NOT EXISTS idx_data_quality_flags_organization_id ON public.data_quality_flags(organization_id);
CREATE INDEX IF NOT EXISTS idx_data_quality_flags_record_id ON public.data_quality_flags(record_id);
CREATE INDEX IF NOT EXISTS idx_data_quality_flags_resolved_at ON public.data_quality_flags(resolved_at);
CREATE INDEX IF NOT EXISTS idx_data_quality_flags_severity ON public.data_quality_flags(severity);

-- driver_performance table
CREATE INDEX IF NOT EXISTS idx_driver_performance_organization_id ON public.driver_performance(organization_id);
CREATE INDEX IF NOT EXISTS idx_driver_performance_driver_id ON public.driver_performance(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_performance_period ON public.driver_performance(calculation_period_start, calculation_period_end);

-- dropoffs table
CREATE INDEX IF NOT EXISTS idx_dropoffs_organization_id ON public.dropoffs(organization_id);
CREATE INDEX IF NOT EXISTS idx_dropoffs_hauler_id ON public.dropoffs(hauler_id);
CREATE INDEX IF NOT EXISTS idx_dropoffs_client_id ON public.dropoffs(client_id);
CREATE INDEX IF NOT EXISTS idx_dropoffs_manifest_id ON public.dropoffs(manifest_id);
CREATE INDEX IF NOT EXISTS idx_dropoffs_dropoff_date ON public.dropoffs(dropoff_date);
CREATE INDEX IF NOT EXISTS idx_dropoffs_pricing_tier_id ON public.dropoffs(pricing_tier_id);

-- entities table
CREATE INDEX IF NOT EXISTS idx_entities_organization_id ON public.entities(organization_id);
CREATE INDEX IF NOT EXISTS idx_entities_kind ON public.entities(kind);

-- facility_hauler_rates table
CREATE INDEX IF NOT EXISTS idx_facility_hauler_rates_organization_id ON public.facility_hauler_rates(organization_id);
CREATE INDEX IF NOT EXISTS idx_facility_hauler_rates_hauler_id ON public.facility_hauler_rates(hauler_id);
CREATE INDEX IF NOT EXISTS idx_facility_hauler_rates_effective_dates ON public.facility_hauler_rates(effective_from, effective_to);

-- hauler_customers table
CREATE INDEX IF NOT EXISTS idx_hauler_customers_hauler_id ON public.hauler_customers(hauler_id);
CREATE INDEX IF NOT EXISTS idx_hauler_customers_is_active ON public.hauler_customers(is_active);

-- hauler_reliability table
CREATE INDEX IF NOT EXISTS idx_hauler_reliability_organization_id ON public.hauler_reliability(organization_id);
CREATE INDEX IF NOT EXISTS idx_hauler_reliability_hauler_id ON public.hauler_reliability(hauler_id);

-- haulers table
CREATE INDEX IF NOT EXISTS idx_haulers_user_id ON public.haulers(user_id);
CREATE INDEX IF NOT EXISTS idx_haulers_is_active ON public.haulers(is_active);
CREATE INDEX IF NOT EXISTS idx_haulers_is_approved ON public.haulers(is_approved);

-- invoice_items table
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_pickup_id ON public.invoice_items(pickup_id);

-- invoices table
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_date ON public.invoices(issued_date);

-- location_pricing_overrides table
CREATE INDEX IF NOT EXISTS idx_location_pricing_overrides_location_id ON public.location_pricing_overrides(location_id);
CREATE INDEX IF NOT EXISTS idx_location_pricing_overrides_organization_id ON public.location_pricing_overrides(organization_id);

-- locations table
CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON public.locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_client_id ON public.locations(client_id);
CREATE INDEX IF NOT EXISTS idx_locations_pricing_tier_id ON public.locations(pricing_tier_id);
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON public.locations(is_active);