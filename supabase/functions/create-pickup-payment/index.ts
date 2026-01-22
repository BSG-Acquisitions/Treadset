import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        persistSession: false
      }
    }
  );

  try {
    console.log('[CREATE-PICKUP-PAYMENT] Function started');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[CREATE-PICKUP-PAYMENT] No Authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authentication required. Please log in again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (authError || !user) {
      console.error('[CREATE-PICKUP-PAYMENT] Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Session expired. Please log in again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    console.log('[CREATE-PICKUP-PAYMENT] User authenticated:', user.id);

    const { pickup_id } = await req.json();
    if (!pickup_id) {
      throw new Error('pickup_id is required');
    }
    console.log('[CREATE-PICKUP-PAYMENT] Processing payment for pickup:', pickup_id);

    // Fetch pickup and client separately to avoid single() coercion issues
    const { data: pickupRow, error: pickupError } = await supabaseClient
      .from('pickups')
      .select('*')
      .eq('id', pickup_id)
      .maybeSingle();

    if (pickupError) {
      throw new Error(`Failed to fetch pickup: ${pickupError.message}`);
    }
    if (!pickupRow) {
      throw new Error('Pickup not found');
    }

    let client: { id: string; company_name: string | null; email: string | null; contact_name: string | null } | null = null;
    if (pickupRow.client_id) {
      const { data: clientRow, error: clientError } = await supabaseClient
        .from('clients')
        .select('id, company_name, email, contact_name')
        .eq('id', pickupRow.client_id)
        .maybeSingle();
      if (clientError) {
        console.log('[CREATE-PICKUP-PAYMENT] Warning: failed to fetch client:', clientError.message);
      }
      client = clientRow ?? null;
    }

    const pickup = { ...pickupRow, client };

    // Allow collecting payment regardless of pickup status; the app controls the flow

    const amount = pickup.computed_revenue || 0;
    if (amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    console.log('[CREATE-PICKUP-PAYMENT] Pickup details:', {
      pickup_id,
      amount,
      client: pickup.client?.company_name,
      status: pickup.status
    });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Check for existing Stripe customer by email
    let customerId;
    if (pickup.client?.email) {
      const customers = await stripe.customers.list({
        email: pickup.client.email,
        limit: 1
      });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log('[CREATE-PICKUP-PAYMENT] Found existing customer:', customerId);
      }
    }

    // Create Payment Intent for manual card entry (card-only, no Link)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      description: `Tire Pickup - ${pickup.client?.company_name || 'Customer'} - ${new Date(pickup.pickup_date).toLocaleDateString()}`,
      metadata: {
        pickup_id: pickup_id,
        organization_id: pickup.organization_id,
        pte_count: pickup.pte_count?.toString() || '0',
        otr_count: pickup.otr_count?.toString() || '0',
        tractor_count: pickup.tractor_count?.toString() || '0',
        pickup_date: pickup.pickup_date
      },
      payment_method_types: ['card'], // force card form
      automatic_payment_methods: { enabled: false }, // disable Link/saved wallets
    });

    console.log('[CREATE-PICKUP-PAYMENT] Payment Intent created:', paymentIntent.id);

    // Record payment intent in database
    const { error: paymentError } = await supabaseClient
      .from('stripe_payments')
      .insert({
        organization_id: pickup.organization_id,
        client_id: pickup.client_id,
        pickup_id: pickup_id,
        manifest_id: pickup.manifest_id,
        amount: Math.round(amount * 100), // Store in cents
        currency: 'usd',
        status: 'pending',
        stripe_payment_intent_id: paymentIntent.id,
        customer_email: pickup.client?.email,
        customer_name: pickup.client?.company_name,
        description: `Pickup payment - ${new Date(pickup.pickup_date).toLocaleDateString()}`,
        metadata: {
          pte_count: pickup.pte_count,
          otr_count: pickup.otr_count,
          tractor_count: pickup.tractor_count,
          pickup_date: pickup.pickup_date
        }
      });

    if (paymentError) {
      console.error('[CREATE-PICKUP-PAYMENT] Failed to record payment:', paymentError);
    }

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[CREATE-PICKUP-PAYMENT] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
