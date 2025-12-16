-- Auto-scheduling settings columns for organization_settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS min_tire_threshold INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS auto_approve_existing_clients BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_approve_in_zone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS outreach_frequency_days INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS booking_email_subject TEXT DEFAULT 'Your Tire Pickup Request Has Been Received',
ADD COLUMN IF NOT EXISTS booking_email_template TEXT;

-- Create booking_analytics table for conversion tracking
CREATE TABLE IF NOT EXISTS public.booking_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  event_type TEXT NOT NULL, -- 'email_sent', 'email_opened', 'email_clicked', 'booking_started', 'booking_completed', 'booking_approved', 'booking_declined'
  booking_request_id UUID REFERENCES booking_requests(id),
  client_id UUID REFERENCES clients(id),
  source TEXT, -- 'outreach_email', 'direct', 'client_portal', 'referral'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE booking_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for booking_analytics
CREATE POLICY "booking_analytics_select" ON booking_analytics
FOR SELECT USING (
  organization_id IN (
    SELECT uo.organization_id 
    FROM user_organization_roles uo 
    JOIN users u ON uo.user_id = u.id 
    WHERE u.auth_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "booking_analytics_insert_service" ON booking_analytics
FOR INSERT WITH CHECK (true);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_booking_analytics_org_event ON booking_analytics(organization_id, event_type);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_created ON booking_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_source ON booking_analytics(source) WHERE source IS NOT NULL;