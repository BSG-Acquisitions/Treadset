import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Hauler {
  id: string;
  organization_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { haulerId } = await req.json().catch(() => ({}));

    console.log('Starting hauler reliability calculation...');

    // Get all active haulers or specific hauler
    const haulerQuery = supabase
      .from('haulers')
      .select('id, organization_id')
      .eq('is_active', true);

    if (haulerId) {
      haulerQuery.eq('id', haulerId);
    }

    const { data: haulers, error: haulerError } = await haulerQuery;

    if (haulerError) throw haulerError;

    console.log(`Processing ${haulers?.length || 0} haulers`);

    let scoresCalculated = 0;

    for (const hauler of haulers || []) {
      // Skip if no organization (shouldn't happen but safety check)
      if (!hauler.organization_id) continue;

      // Get dropoff data for this hauler
      const { data: dropoffs, error: dropoffError } = await supabase
        .from('dropoffs')
        .select('id, dropoff_date, dropoff_time, status, payment_status, manifest_id, created_at')
        .eq('hauler_id', hauler.id)
        .order('created_at', { ascending: false })
        .limit(100); // Last 100 dropoffs for analysis

      if (dropoffError) {
        console.error(`Error fetching dropoffs for hauler ${hauler.id}:`, dropoffError);
        continue;
      }

      const totalDropoffs = dropoffs?.length || 0;

      if (totalDropoffs === 0) {
        // No data yet, set default scores
        await supabase
          .from('hauler_reliability')
          .upsert({
            hauler_id: hauler.id,
            organization_id: hauler.organization_id,
            reliability_score: 0,
            on_time_rate: 0,
            manifest_accuracy_rate: 0,
            payment_promptness_rate: 0,
            total_dropoffs: 0,
            on_time_dropoffs: 0,
            accurate_manifests: 0,
            prompt_payments: 0,
            last_calculated_at: new Date().toISOString(),
          }, { onConflict: 'hauler_id,organization_id' });

        scoresCalculated++;
        continue;
      }

      // Calculate on-time drop-off rate (40%)
      // Consider "on-time" if dropoff happened within 24 hours of creation
      let onTimeDropoffs = 0;
      for (const dropoff of dropoffs || []) {
        const createdAt = new Date(dropoff.created_at);
        const dropoffDate = new Date(`${dropoff.dropoff_date}T${dropoff.dropoff_time || '00:00:00'}`);
        const hoursDiff = (dropoffDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff <= 24 && dropoff.status === 'completed') {
          onTimeDropoffs++;
        }
      }
      const onTimeRate = (onTimeDropoffs / totalDropoffs) * 100;

      // Calculate manifest accuracy (30%)
      // Consider accurate if manifest exists and is completed
      let accurateManifests = 0;
      for (const dropoff of dropoffs || []) {
        if (dropoff.manifest_id) {
          const { data: manifest } = await supabase
            .from('manifests')
            .select('status')
            .eq('id', dropoff.manifest_id)
            .single();

          if (manifest && manifest.status === 'COMPLETED') {
            accurateManifests++;
          }
        }
      }
      const manifestAccuracyRate = (accurateManifests / totalDropoffs) * 100;

      // Calculate payment promptness (30%)
      // Consider prompt if payment_status is 'paid' or 'SUCCEEDED'
      let promptPayments = 0;
      for (const dropoff of dropoffs || []) {
        if (dropoff.payment_status === 'paid' || dropoff.payment_status === 'SUCCEEDED') {
          promptPayments++;
        }
      }
      const paymentPromptnessRate = (promptPayments / totalDropoffs) * 100;

      // Calculate composite reliability score
      const reliabilityScore = Math.round(
        (onTimeRate * 0.40) +
        (manifestAccuracyRate * 0.30) +
        (paymentPromptnessRate * 0.30)
      );

      console.log(`Hauler ${hauler.id}: Score ${reliabilityScore} (On-time: ${onTimeRate.toFixed(1)}%, Accuracy: ${manifestAccuracyRate.toFixed(1)}%, Payment: ${paymentPromptnessRate.toFixed(1)}%)`);

      // Upsert reliability score
      const { error: upsertError } = await supabase
        .from('hauler_reliability')
        .upsert({
          hauler_id: hauler.id,
          organization_id: hauler.organization_id,
          reliability_score: reliabilityScore,
          on_time_rate: parseFloat(onTimeRate.toFixed(2)),
          manifest_accuracy_rate: parseFloat(manifestAccuracyRate.toFixed(2)),
          payment_promptness_rate: parseFloat(paymentPromptnessRate.toFixed(2)),
          total_dropoffs: totalDropoffs,
          on_time_dropoffs: onTimeDropoffs,
          accurate_manifests: accurateManifests,
          prompt_payments: promptPayments,
          last_calculated_at: new Date().toISOString(),
        }, { onConflict: 'hauler_id,organization_id' });

      if (upsertError) {
        console.error(`Error upserting reliability for hauler ${hauler.id}:`, upsertError);
        continue;
      }

      scoresCalculated++;
    }

    // Log to system_updates
    await supabase.from('system_updates').insert({
      module_name: 'hauler_reliability_calculation',
      status: 'live',
      notes: `Calculated reliability scores for ${scoresCalculated} haulers. Composite scoring: On-time (40%), Manifest accuracy (30%), Payment promptness (30%).`,
      impacted_tables: ['hauler_reliability'],
    });

    console.log(`Reliability calculation complete: ${scoresCalculated} haulers processed`);

    return new Response(
      JSON.stringify({
        success: true,
        scoresCalculated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Hauler reliability calculation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
