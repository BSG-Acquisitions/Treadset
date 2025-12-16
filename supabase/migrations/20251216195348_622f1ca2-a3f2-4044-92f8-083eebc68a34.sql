-- Phase 1: Database Foundation for Geographic-Aware Self-Scheduling

-- Service Zones table - Define geographic zones by ZIP codes
CREATE TABLE public.service_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  description TEXT,
  primary_service_days TEXT[] NOT NULL DEFAULT '{}',
  zip_codes TEXT[] NOT NULL DEFAULT '{}',
  center_lat NUMERIC,
  center_lng NUMERIC,
  max_detour_miles NUMERIC DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Booking Requests table - Queue for self-scheduled pickup requests
CREATE TABLE public.booking_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES public.service_zones(id) ON DELETE SET NULL,
  
  -- Contact info (for new clients or guests)
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  company_name TEXT,
  
  -- Location info
  pickup_address TEXT NOT NULL,
  pickup_city TEXT,
  pickup_state TEXT DEFAULT 'MI',
  pickup_zip TEXT,
  pickup_lat NUMERIC,
  pickup_lng NUMERIC,
  
  -- Request details
  requested_date DATE NOT NULL,
  preferred_time_window TEXT,
  tire_estimate_pte INTEGER DEFAULT 0,
  tire_estimate_otr INTEGER DEFAULT 0,
  tire_estimate_tractor INTEGER DEFAULT 0,
  estimated_value NUMERIC GENERATED ALWAYS AS (
    COALESCE(tire_estimate_pte, 0) + 
    (COALESCE(tire_estimate_otr, 0) * 15) + 
    (COALESCE(tire_estimate_tractor, 0) * 5)
  ) STORED,
  notes TEXT,
  
  -- Zone matching info
  zone_matched BOOLEAN DEFAULT false,
  detour_distance_miles NUMERIC,
  route_efficiency_impact NUMERIC,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'modified', 'declined', 'cancelled')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- If approved, link to created pickup
  pickup_id UUID REFERENCES public.pickups(id) ON DELETE SET NULL,
  
  -- If modified, track the suggested alternative
  suggested_date DATE,
  modification_reason TEXT,
  modification_confirmed BOOLEAN DEFAULT false,
  modification_confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- If declined, track reason
  decline_reason TEXT,
  
  -- Email tracking
  confirmation_email_sent_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Client Email Preferences table - Manage outreach and preferences
CREATE TABLE public.client_email_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Preferences
  can_receive_outreach BOOLEAN DEFAULT true,
  can_receive_reminders BOOLEAN DEFAULT true,
  can_receive_confirmations BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  unsubscribe_reason TEXT,
  
  -- Tracking
  last_outreach_sent_at TIMESTAMP WITH TIME ZONE,
  outreach_count INTEGER DEFAULT 0,
  last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_count INTEGER DEFAULT 0,
  
  -- Engagement tracking
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  bookings_from_email INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id, client_id)
);

-- Enable RLS
ALTER TABLE public.service_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_email_preferences ENABLE ROW LEVEL SECURITY;

-- Service Zones policies
CREATE POLICY "service_zones_select" ON public.service_zones
  FOR SELECT USING (
    organization_id IN (
      SELECT uo.organization_id FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "service_zones_insert" ON public.service_zones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = service_zones.organization_id
      AND uo.role IN ('admin', 'ops_manager')
    )
  );

CREATE POLICY "service_zones_update" ON public.service_zones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = service_zones.organization_id
      AND uo.role IN ('admin', 'ops_manager')
    )
  );

CREATE POLICY "service_zones_delete" ON public.service_zones
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = service_zones.organization_id
      AND uo.role IN ('admin', 'ops_manager')
    )
  );

-- Booking Requests policies (allow public insert for self-scheduling)
CREATE POLICY "booking_requests_select" ON public.booking_requests
  FOR SELECT USING (
    organization_id IN (
      SELECT uo.organization_id FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "booking_requests_insert_public" ON public.booking_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "booking_requests_update" ON public.booking_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = booking_requests.organization_id
      AND uo.role IN ('admin', 'ops_manager', 'dispatcher', 'sales')
    )
  );

-- Client Email Preferences policies
CREATE POLICY "client_email_preferences_select" ON public.client_email_preferences
  FOR SELECT USING (
    organization_id IN (
      SELECT uo.organization_id FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "client_email_preferences_insert" ON public.client_email_preferences
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = client_email_preferences.organization_id
    )
  );

CREATE POLICY "client_email_preferences_update" ON public.client_email_preferences
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = client_email_preferences.organization_id
    )
  );

-- Indexes for performance
CREATE INDEX idx_service_zones_org ON public.service_zones(organization_id);
CREATE INDEX idx_service_zones_active ON public.service_zones(organization_id, is_active);
CREATE INDEX idx_booking_requests_org_status ON public.booking_requests(organization_id, status);
CREATE INDEX idx_booking_requests_date ON public.booking_requests(requested_date);
CREATE INDEX idx_booking_requests_client ON public.booking_requests(client_id);
CREATE INDEX idx_client_email_prefs_client ON public.client_email_preferences(client_id);

-- Triggers for updated_at
CREATE TRIGGER update_service_zones_updated_at
  BEFORE UPDATE ON public.service_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_booking_requests_updated_at
  BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_email_prefs_updated_at
  BEFORE UPDATE ON public.client_email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();