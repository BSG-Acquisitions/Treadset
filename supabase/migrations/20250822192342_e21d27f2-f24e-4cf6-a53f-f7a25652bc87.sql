-- Performance and reliability improvements
-- 1) BTREE indexes on common filters/joins and RLS paths
-- 2) Unique constraints where appropriate
-- 3) BEFORE UPDATE triggers to maintain updated_at automatically

-- ============== INDEXES ==============
-- assignments
CREATE INDEX IF NOT EXISTS idx_assignments_org ON public.assignments (organization_id);
CREATE INDEX IF NOT EXISTS idx_assignments_pickup_id ON public.assignments (pickup_id);
CREATE INDEX IF NOT EXISTS idx_assignments_vehicle_id ON public.assignments (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.assignments (status);
CREATE INDEX IF NOT EXISTS idx_assignments_scheduled_date ON public.assignments (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_assignments_estimated_arrival ON public.assignments (estimated_arrival);

-- clients
CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients (organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_pricing_tier_id ON public.clients (pricing_tier_id);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients (is_active);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON public.clients (company_name);

-- pickups
CREATE INDEX IF NOT EXISTS idx_pickups_org ON public.pickups (organization_id);
CREATE INDEX IF NOT EXISTS idx_pickups_client_id ON public.pickups (client_id);
CREATE INDEX IF NOT EXISTS idx_pickups_location_id ON public.pickups (location_id);
CREATE INDEX IF NOT EXISTS idx_pickups_status ON public.pickups (status);
CREATE INDEX IF NOT EXISTS idx_pickups_pickup_date ON public.pickups (pickup_date);

-- manifests
CREATE INDEX IF NOT EXISTS idx_manifests_org ON public.manifests (organization_id);
CREATE INDEX IF NOT EXISTS idx_manifests_client_id ON public.manifests (client_id);
CREATE INDEX IF NOT EXISTS idx_manifests_pickup_id ON public.manifests (pickup_id);
CREATE INDEX IF NOT EXISTS idx_manifests_status ON public.manifests (status);
CREATE INDEX IF NOT EXISTS idx_manifests_signed_at ON public.manifests (signed_at);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_manifests_org_manifest_number ON public.manifests (organization_id, manifest_number);

-- invoices & items
CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices (organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices (created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_date ON public.invoices (issued_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices (due_date);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_invoices_number ON public.invoices (invoice_number);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_pickup_id ON public.invoice_items (pickup_id);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_org ON public.payments (organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments (client_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments (payment_date);

-- locations
CREATE INDEX IF NOT EXISTS idx_locations_org ON public.locations (organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_client_id ON public.locations (client_id);
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON public.locations (is_active);
CREATE INDEX IF NOT EXISTS idx_locations_name ON public.locations (name);

-- pricing & overrides
CREATE INDEX IF NOT EXISTS idx_price_matrix_org ON public.price_matrix (organization_id);
CREATE INDEX IF NOT EXISTS idx_price_matrix_tire_service_rim ON public.price_matrix (tire_category, service_mode, rim);
CREATE INDEX IF NOT EXISTS idx_price_matrix_effective ON public.price_matrix (effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_org ON public.pricing_tiers (organization_id);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_name ON public.pricing_tiers (name);

CREATE INDEX IF NOT EXISTS idx_price_versions_org ON public.price_versions (organization_id);
CREATE INDEX IF NOT EXISTS idx_price_versions_is_active ON public.price_versions (is_active);

CREATE INDEX IF NOT EXISTS idx_client_summaries_org ON public.client_summaries (organization_id);
CREATE INDEX IF NOT EXISTS idx_client_summaries_client_year_month ON public.client_summaries (client_id, year, month);

CREATE INDEX IF NOT EXISTS idx_client_workflows_org ON public.client_workflows (organization_id);
CREATE INDEX IF NOT EXISTS idx_client_workflows_client_status ON public.client_workflows (client_id, status);
CREATE INDEX IF NOT EXISTS idx_client_workflows_next_contact_date ON public.client_workflows (next_contact_date);

CREATE INDEX IF NOT EXISTS idx_client_pricing_overrides_org ON public.client_pricing_overrides (organization_id);
CREATE INDEX IF NOT EXISTS idx_client_pricing_overrides_client ON public.client_pricing_overrides (client_id);
CREATE INDEX IF NOT EXISTS idx_client_pricing_overrides_tire_service_rim ON public.client_pricing_overrides (tire_category, service_mode, rim);
CREATE INDEX IF NOT EXISTS idx_client_pricing_overrides_effective ON public.client_pricing_overrides (effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_location_pricing_overrides_org ON public.location_pricing_overrides (organization_id);
CREATE INDEX IF NOT EXISTS idx_location_pricing_overrides_location ON public.location_pricing_overrides (location_id);
CREATE INDEX IF NOT EXISTS idx_location_pricing_overrides_tire_service_rim ON public.location_pricing_overrides (tire_category, service_mode, rim);
CREATE INDEX IF NOT EXISTS idx_location_pricing_overrides_effective ON public.location_pricing_overrides (effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_surcharge_rules_org ON public.surcharge_rules (organization_id);
CREATE INDEX IF NOT EXISTS idx_surcharge_rules_type_active ON public.surcharge_rules (type, is_active);
CREATE INDEX IF NOT EXISTS idx_surcharge_rules_effective ON public.surcharge_rules (effective_from, effective_to, priority);

-- users & org roles & prefs
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

CREATE INDEX IF NOT EXISTS idx_user_org_roles_user ON public.user_organization_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_org_roles_org ON public.user_organization_roles (organization_id);
CREATE INDEX IF NOT EXISTS idx_user_org_roles_role ON public.user_organization_roles (role);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_user_preferences_user ON public.user_preferences (user_id);

-- vehicles & orgs
CREATE INDEX IF NOT EXISTS idx_vehicles_org ON public.vehicles (organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON public.vehicles (is_active);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_organizations_slug ON public.organizations (slug);

-- analytics (if table used for reporting)
CREATE INDEX IF NOT EXISTS idx_pickup_analytics_org ON public.pickup_analytics (organization_id);
CREATE INDEX IF NOT EXISTS idx_pickup_analytics_client ON public.pickup_analytics (client_id);
CREATE INDEX IF NOT EXISTS idx_pickup_analytics_year_month ON public.pickup_analytics (year, month);

-- ============== TRIGGERS FOR updated_at ==============
-- Helper DO blocks to create triggers only if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_assignments_updated_at') THEN
    CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON public.assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at') THEN
    CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_client_summaries_updated_at') THEN
    CREATE TRIGGER update_client_summaries_updated_at
    BEFORE UPDATE ON public.client_summaries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_client_workflows_updated_at') THEN
    CREATE TRIGGER update_client_workflows_updated_at
    BEFORE UPDATE ON public.client_workflows
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_locations_updated_at') THEN
    CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON public.locations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_manifests_updated_at') THEN
    CREATE TRIGGER update_manifests_updated_at
    BEFORE UPDATE ON public.manifests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organization_settings_updated_at') THEN
    CREATE TRIGGER update_organization_settings_updated_at
    BEFORE UPDATE ON public.organization_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organizations_updated_at') THEN
    CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payments_updated_at') THEN
    CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pickups_updated_at') THEN
    CREATE TRIGGER update_pickups_updated_at
    BEFORE UPDATE ON public.pickups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_price_matrix_updated_at') THEN
    CREATE TRIGGER update_price_matrix_updated_at
    BEFORE UPDATE ON public.price_matrix
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_price_versions_updated_at') THEN
    CREATE TRIGGER update_price_versions_updated_at
    BEFORE UPDATE ON public.price_versions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pricing_tiers_updated_at') THEN
    CREATE TRIGGER update_pricing_tiers_updated_at
    BEFORE UPDATE ON public.pricing_tiers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_surcharge_rules_updated_at') THEN
    CREATE TRIGGER update_surcharge_rules_updated_at
    BEFORE UPDATE ON public.surcharge_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_preferences_updated_at') THEN
    CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
    CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_vehicles_updated_at') THEN
    CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;