import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TireLineItem {
  description: string;
  quantity: number;
  unit_amount: number; // in cents
}

interface CheckoutRequest {
  line_items: TireLineItem[];
  customer_email?: string;
  customer_name?: string;
  pickup_id?: string;
  manifest_id?: string;
  client_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error('[CREATE-TIRE-CHECKOUT] No Authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authentication required. Please log in again.' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
    const user = data.user;
    
    if (authError || !user?.email) {
      console.error('[CREATE-TIRE-CHECKOUT] Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Session expired. Please log in again.' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const body: CheckoutRequest = await req.json();
    
    if (!body.line_items || body.line_items.length === 0) {
      throw new Error("No line items provided");
    }

    // Get organization_id from pickup if available
    let organizationId: string | null = null;
    if (body.pickup_id) {
      const { data: pickup } = await supabaseAdmin
        .from('pickups')
        .select('organization_id')
        .eq('id', body.pickup_id)
        .maybeSingle();
      organizationId = pickup?.organization_id || null;
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ 
      email: body.customer_email || user.email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create line items for Stripe
    const stripeLineItems = body.line_items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.description,
        },
        unit_amount: item.unit_amount, // Already in cents
      },
      quantity: item.quantity,
    }));

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : (body.customer_email || user.email),
      line_items: stripeLineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/driver/routes?payment=success`,
      cancel_url: `${req.headers.get("origin")}/driver/routes?payment=cancelled`,
      metadata: {
        pickup_id: body.pickup_id || '',
        manifest_id: body.manifest_id || '',
        client_id: body.client_id || '',
        user_id: user.id,
      },
    });

    // Record payment intent in database
    const { error: insertError } = await supabaseAdmin
      .from('stripe_payments')
      .insert({
        organization_id: organizationId,
        stripe_session_id: session.id,
        amount: session.amount_total || 0,
        currency: session.currency || 'usd',
        status: 'pending',
        customer_email: body.customer_email || user.email,
        customer_name: body.customer_name,
        pickup_id: body.pickup_id,
        manifest_id: body.manifest_id,
        client_id: body.client_id,
        metadata: { line_items: body.line_items },
      });

    if (insertError) {
      console.error('Error recording payment:', insertError);
    }

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating checkout:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
