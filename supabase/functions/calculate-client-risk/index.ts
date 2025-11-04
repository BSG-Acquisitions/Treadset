import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClientRiskData {
  client_id: string;
  organization_id: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  pickup_frequency_decline: number | null;
  avg_payment_delay_days: number | null;
  contact_gap_ratio: number | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { client_id } = await req.json();

    console.log('Calculating risk for client:', client_id);

    // Get client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, organization_id, created_at')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    // Calculate pickup frequency decline
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: recentPickups } = await supabase
      .from('pickups')
      .select('id, pickup_date')
      .eq('client_id', client_id)
      .gte('pickup_date', threeMonthsAgo.toISOString())
      .order('pickup_date', { ascending: false });

    const { data: oldPickups } = await supabase
      .from('pickups')
      .select('id, pickup_date')
      .eq('client_id', client_id)
      .gte('pickup_date', sixMonthsAgo.toISOString())
      .lt('pickup_date', threeMonthsAgo.toISOString())
      .order('pickup_date', { ascending: false });

    const recentCount = recentPickups?.length || 0;
    const oldCount = oldPickups?.length || 0;
    const pickupDecline = oldCount > 0 ? ((oldCount - recentCount) / oldCount) * 100 : 0;

    // Calculate payment delays
    const { data: manifests } = await supabase
      .from('manifests')
      .select('created_at, signed_at, payment_status')
      .eq('client_id', client_id)
      .gte('created_at', sixMonthsAgo.toISOString())
      .not('signed_at', 'is', null);

    let totalDelayDays = 0;
    let delayCount = 0;

    if (manifests && manifests.length > 0) {
      manifests.forEach((manifest) => {
        if (manifest.signed_at) {
          const created = new Date(manifest.created_at);
          const signed = new Date(manifest.signed_at);
          const delayDays = Math.floor((signed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          if (delayDays > 0) {
            totalDelayDays += delayDays;
            delayCount++;
          }
        }
      });
    }

    const avgPaymentDelay = delayCount > 0 ? totalDelayDays / delayCount : 0;

    // Calculate contact gap ratio
    const { data: clientWorkflow } = await supabase
      .from('client_workflows')
      .select('contact_frequency_days, last_contact_date')
      .eq('client_id', client_id)
      .single();

    let contactGapRatio = 0;
    if (clientWorkflow?.last_contact_date && clientWorkflow.contact_frequency_days) {
      const lastContact = new Date(clientWorkflow.last_contact_date);
      const daysSinceContact = Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
      contactGapRatio = daysSinceContact / clientWorkflow.contact_frequency_days;
    }

    // Calculate risk score (0-100)
    let riskScore = 0;

    // Pickup frequency decline (max 40 points)
    if (pickupDecline > 25) {
      riskScore += Math.min(40, (pickupDecline / 100) * 40);
    }

    // Payment delays (max 35 points)
    if (avgPaymentDelay > 10) {
      riskScore += Math.min(35, (avgPaymentDelay / 30) * 35);
    }

    // Contact gap (max 25 points)
    if (contactGapRatio > 2) {
      riskScore += Math.min(25, (contactGapRatio / 5) * 25);
    }

    riskScore = Math.round(Math.min(100, riskScore));

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore <= 40) {
      riskLevel = 'low';
    } else if (riskScore <= 70) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    const riskData: ClientRiskData = {
      client_id: client.id,
      organization_id: client.organization_id,
      risk_score: riskScore,
      risk_level: riskLevel,
      pickup_frequency_decline: pickupDecline > 0 ? pickupDecline : null,
      avg_payment_delay_days: avgPaymentDelay > 0 ? avgPaymentDelay : null,
      contact_gap_ratio: contactGapRatio > 0 ? contactGapRatio : null,
    };

    // Upsert risk score
    const { error: upsertError } = await supabase
      .from('client_risk_scores_beta')
      .upsert(riskData, {
        onConflict: 'client_id',
      });

    if (upsertError) {
      console.error('Error upserting risk score:', upsertError);
      throw upsertError;
    }

    console.log('Risk calculation complete:', riskData);

    return new Response(
      JSON.stringify({ success: true, data: riskData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error calculating client risk:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});