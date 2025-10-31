-- Add email delivery tracking fields to manifests table
ALTER TABLE manifests 
ADD COLUMN IF NOT EXISTS email_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS email_sent_to text[],
ADD COLUMN IF NOT EXISTS email_status text DEFAULT 'not_sent',
ADD COLUMN IF NOT EXISTS email_resend_id text,
ADD COLUMN IF NOT EXISTS email_error text;

-- Add index for email status queries
CREATE INDEX IF NOT EXISTS idx_manifests_email_status ON manifests(email_status);

-- Add comment explaining email status values
COMMENT ON COLUMN manifests.email_status IS 'Email delivery status: not_sent, sent, delivered, bounced, failed';
COMMENT ON COLUMN manifests.email_resend_id IS 'Resend email ID for tracking delivery status';
COMMENT ON COLUMN manifests.email_sent_at IS 'Timestamp when email was successfully sent';
COMMENT ON COLUMN manifests.email_sent_to IS 'Array of email addresses the manifest was sent to';
COMMENT ON COLUMN manifests.email_error IS 'Error message if email sending failed';