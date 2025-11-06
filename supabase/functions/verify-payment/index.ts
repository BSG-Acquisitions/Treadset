import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      logStep("Authentication failed", { error: authError });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    logStep("User authenticated", { userId: user.id });

    const { session_id } = await req.json();
    
    if (!session_id) {
      throw new Error("session_id is required");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // First, verify the payment belongs to user's organization
    const { data: payment, error: paymentError } = await supabaseService
      .from("stripe_payments")
      .select("*, organization_id")
      .eq("stripe_session_id", session_id)
      .single();

    if (paymentError || !payment) {
      logStep("Payment not found", { error: paymentError });
      return new Response(
        JSON.stringify({ error: 'Payment not found' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Verify user has access to this payment's organization
    const { data: userOrg, error: orgError } = await supabaseService
      .from('user_organization_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', payment.organization_id)
      .single();

    if (orgError || !userOrg) {
      logStep("User not authorized for this organization", { 
        userId: user.id, 
        orgId: payment.organization_id 
      });
      return new Response(
        JSON.stringify({ error: 'Not authorized to access this payment' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    logStep("Authorization verified", { organizationId: payment.organization_id });

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Retrieved Stripe session", { status: session.payment_status });

    // Update payment status in database
    const updateData: any = {
      status: session.payment_status === 'paid' ? 'paid' : session.payment_status,
      updated_at: new Date().toISOString()
    };

    if (session.payment_intent) {
      updateData.stripe_payment_intent_id = session.payment_intent;
    }

    const { data: payment, error } = await supabaseService
      .from("stripe_payments")
      .update(updateData)
      .eq("stripe_session_id", session_id)
      .select()
      .single();

    if (error) {
      logStep("Error updating payment", { error });
      throw new Error(`Failed to update payment: ${error.message}`);
    }

    logStep("Payment updated successfully", { paymentId: payment.id, status: payment.status });

    return new Response(JSON.stringify({
      success: true,
      payment: payment,
      session_status: session.payment_status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});