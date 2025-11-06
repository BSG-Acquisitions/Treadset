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
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('[VERIFY-PICKUP-PAYMENT] Function started');

    // Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('[VERIFY-PICKUP-PAYMENT] Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('[VERIFY-PICKUP-PAYMENT] User authenticated:', user.id);

    const { session_id, pickup_id } = await req.json();
    if (!session_id || !pickup_id) {
      throw new Error('session_id and pickup_id are required');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2025-08-27.basil',
    });

    // Verify pickup belongs to user's organization
    const { data: pickup, error: pickupError } = await supabaseClient
      .from('pickups')
      .select('organization_id')
      .eq('id', pickup_id)
      .single();

    if (pickupError || !pickup) {
      console.error('[VERIFY-PICKUP-PAYMENT] Pickup not found:', pickupError);
      return new Response(
        JSON.stringify({ error: 'Pickup not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Verify user has access to this pickup's organization
    const { data: userOrg, error: orgError } = await supabaseClient
      .from('user_organization_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', pickup.organization_id)
      .single();

    if (orgError || !userOrg) {
      console.error('[VERIFY-PICKUP-PAYMENT] User not authorized:', { userId: user.id, orgId: pickup.organization_id });
      return new Response(
        JSON.stringify({ error: 'Not authorized to access this pickup' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log('[VERIFY-PICKUP-PAYMENT] Authorization verified');

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('[VERIFY-PICKUP-PAYMENT] Session status:', session.payment_status);

    if (session.payment_status === 'paid') {
      // Update stripe_payments record
      const { error: updatePaymentError } = await supabaseClient
        .from('stripe_payments')
        .update({
          status: 'succeeded',
          stripe_payment_intent_id: session.payment_intent as string,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_session_id', session_id);

      if (updatePaymentError) {
        console.error('[VERIFY-PICKUP-PAYMENT] Failed to update payment:', updatePaymentError);
      }

      // Update pickup payment status with new payment tracking columns
      const { error: updatePickupError } = await supabaseClient
        .from('pickups')
        .update({
          payment_status: 'SUCCEEDED',
          payment_method: 'CARD',
          manifest_payment_status: 'SUCCEEDED', // Keep legacy field for compatibility
          updated_at: new Date().toISOString()
        })
        .eq('id', pickup_id);

      if (updatePickupError) {
        console.error('[VERIFY-PICKUP-PAYMENT] Failed to update pickup:', updatePickupError);
      }

      console.log('[VERIFY-PICKUP-PAYMENT] Payment verified and recorded');

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'paid',
          amount: session.amount_total / 100 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: session.payment_status 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error('[VERIFY-PICKUP-PAYMENT] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
