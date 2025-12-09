-- Add email tracking fields to trailer_events table
ALTER TABLE public.trailer_events
ADD COLUMN IF NOT EXISTS email_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS email_sent_to text[],
ADD COLUMN IF NOT EXISTS email_status text,
ADD COLUMN IF NOT EXISTS email_resend_id text,
ADD COLUMN IF NOT EXISTS email_error text,
ADD COLUMN IF NOT EXISTS location_contact_email text,
ADD COLUMN IF NOT EXISTS location_contact_name text;

-- Add comment for documentation
COMMENT ON COLUMN public.trailer_events.email_sent_at IS 'Timestamp when manifest email was sent';
COMMENT ON COLUMN public.trailer_events.email_sent_to IS 'Array of email recipients';
COMMENT ON COLUMN public.trailer_events.email_status IS 'Email status: pending, sent, failed';
COMMENT ON COLUMN public.trailer_events.email_resend_id IS 'Resend API email ID for tracking';
COMMENT ON COLUMN public.trailer_events.location_contact_email IS 'Contact email at location for manifest delivery';
COMMENT ON COLUMN public.trailer_events.location_contact_name IS 'Contact name at location';