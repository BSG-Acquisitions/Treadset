-- Create payments table to track Stripe transactions
CREATE TABLE public.stripe_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  client_id UUID REFERENCES public.clients(id),
  pickup_id UUID REFERENCES public.pickups(id),
  manifest_id UUID REFERENCES public.manifests(id),
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed, cancelled
  customer_email TEXT,
  customer_name TEXT,
  description TEXT,
  metadata JSONB,
  processed_by UUID REFERENCES public.users(id), -- Who initiated the payment
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stripe_payments ENABLE ROW LEVEL SECURITY;

-- Policy for org members to access payments
CREATE POLICY "Org members can access payments" 
ON public.stripe_payments 
FOR ALL 
USING (organization_id IN (
  SELECT uo.organization_id 
  FROM user_organization_roles uo 
  JOIN users u ON uo.user_id = u.id 
  WHERE u.auth_user_id = auth.uid()
));

-- Policy for service role (edge functions)
CREATE POLICY "Service role can access payments" 
ON public.stripe_payments 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_stripe_payments_organization_id ON public.stripe_payments(organization_id);
CREATE INDEX idx_stripe_payments_client_id ON public.stripe_payments(client_id);
CREATE INDEX idx_stripe_payments_status ON public.stripe_payments(status);
CREATE INDEX idx_stripe_payments_created_at ON public.stripe_payments(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_stripe_payments_updated_at
  BEFORE UPDATE ON public.stripe_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();