import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePaymentRequest {
  amount: number; // Amount in dollars (will be converted to cents)
  description: string;
  customer_email?: string;
  customer_name?: string;
  client_id?: string;
  pickup_id?: string;
  manifest_id?: string;
  metadata?: Record<string, any>;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    // Create Supabase client for authentication and service operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const requestBody = await req.json() as CreatePaymentRequest;
    const { amount, description, customer_email, customer_name, client_id, pickup_id, manifest_id, metadata } = requestBody;

    logStep("Request received", { amount, description, client_id, pickup_id });

    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Try to get authenticated user (optional for guest payments)
    let userId = null;
    let organizationId = null;
    
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabaseService.auth.getUser(token);
        if (userData.user) {
          userId = userData.user.id;
          logStep("User authenticated", { userId });

          // Get user's organization
          const { data: userOrg } = await supabaseService
            .from("user_organization_roles")
            .select("organization_id")
            .eq("user_id", userData.user.id)
            .single();
          
          if (userOrg) {
            organizationId = userOrg.organization_id;
          }
        }
      }
    } catch (error) {
      logStep("No authentication or failed to authenticate (proceeding as guest)", { error: error.message });
    }

    // If no organization from user, try to get it from client_id
    if (!organizationId && client_id) {
      const { data: client } = await supabaseService
        .from("clients")
        .select("organization_id")
        .eq("id", client_id)
        .single();
      
      if (client) {
        organizationId = client.organization_id;
        logStep("Got organization from client", { organizationId });
      }
    }

    // Default to BSG organization if none found (for guest payments)
    if (!organizationId) {
      const { data: bsgOrg } = await supabaseService
        .from("organizations")
        .select("id")
        .eq("slug", "bsg")
        .single();
      
      if (bsgOrg) {
        organizationId = bsgOrg.id;
        logStep("Using default BSG organization", { organizationId });
      }
    }

    if (!organizationId) {
      throw new Error("Unable to determine organization");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists in Stripe (if email provided)
    let customerId;
    if (customer_email) {
      const customers = await stripe.customers.list({ email: customer_email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Stripe customer", { customerId });
      }
    }

    // Create a one-time payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customer_email || "guest@bsgtires.com",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: description || "BSG Tire Service",
              description: `Payment for ${description || "tire recycling services"}`
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/payment-cancelled`,
      metadata: {
        client_id: client_id || "",
        pickup_id: pickup_id || "",
        manifest_id: manifest_id || "",
        organization_id: organizationId,
        processed_by: userId || "",
        ...metadata
      }
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Record payment in Supabase
    const paymentRecord = {
      organization_id: organizationId,
      client_id: client_id || null,
      pickup_id: pickup_id || null,
      manifest_id: manifest_id || null,
      stripe_session_id: session.id,
      amount: amountInCents,
      currency: "usd",
      status: "pending",
      customer_email: customer_email || "guest@bsgtires.com",
      customer_name: customer_name || null,
      description: description || "BSG Tire Service",
      metadata: metadata ? JSON.stringify(metadata) : null,
      processed_by: userId
    };

    const { data: payment, error: paymentError } = await supabaseService
      .from("stripe_payments")
      .insert(paymentRecord)
      .select()
      .single();

    if (paymentError) {
      logStep("Error recording payment", { error: paymentError });
      throw new Error(`Failed to record payment: ${paymentError.message}`);
    }

    logStep("Payment recorded in database", { paymentId: payment.id });

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id,
      payment_id: payment.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});