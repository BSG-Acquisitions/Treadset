-- Create email_bounces table to track bounced and complained emails
CREATE TABLE public.email_bounces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  bounce_type TEXT NOT NULL, -- 'bounce' or 'complaint'
  bounce_reason TEXT,
  resend_email_id TEXT,
  bounced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_bounces ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage bounces (webhook will use service role)
CREATE POLICY "Service role can manage bounces"
  ON public.email_bounces
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for email lookups
CREATE INDEX idx_email_bounces_email ON public.email_bounces(email);

COMMENT ON TABLE public.email_bounces IS 'Tracks email addresses that have bounced or received complaints to prevent sending to them';
