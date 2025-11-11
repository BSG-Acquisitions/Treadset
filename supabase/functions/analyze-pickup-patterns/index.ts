import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PickupPattern {
  client_id: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'irregular';
  confidence_score: number;
  typical_day_of_week: number | null;
  typical_week_of_month: number | null;
  last_pickup_date: string;
  average_days_between_pickups: number;
  total_pickups_analyzed: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { organization_id } = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[PATTERN_ANALYSIS] Analyzing pickup patterns for org: ${organization_id}`);

    // Get all clients with at least 3 completed pickups in last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, company_name')
      .eq('organization_id', organization_id)
      .eq('is_active', true);

    if (clientsError) throw clientsError;

    const patterns: PickupPattern[] = [];
    let analyzed = 0;
    let patternsFound = 0;

    for (const client of clients || []) {
      // Get completed pickups for this client
      const { data: pickups, error: pickupsError } = await supabase
        .from('pickups')
        .select('pickup_date, status')
        .eq('client_id', client.id)
        .eq('organization_id', organization_id)
        .eq('status', 'completed')
        .gte('pickup_date', sixMonthsAgo.toISOString().split('T')[0])
        .order('pickup_date', { ascending: true });

      if (pickupsError) throw pickupsError;

      analyzed++;

      // Need at least 3 pickups to detect a pattern
      if (!pickups || pickups.length < 3) {
        console.log(`[PATTERN_ANALYSIS] ${client.company_name}: Not enough data (${pickups?.length || 0} pickups)`);
        continue;
      }

      // Calculate days between each pickup
      const intervals: number[] = [];
      for (let i = 1; i < pickups.length; i++) {
        const prev = new Date(pickups[i - 1].pickup_date);
        const curr = new Date(pickups[i].pickup_date);
        const daysDiff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        intervals.push(daysDiff);
      }

      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      const stdDev = Math.sqrt(
        intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length
      );

      // Determine frequency and confidence
      let frequency: 'weekly' | 'biweekly' | 'monthly' | 'irregular' = 'irregular';
      let confidence = 0;

      // Weekly: avg 7 days ± 3 days
      if (avgInterval >= 4 && avgInterval <= 10) {
        frequency = 'weekly';
        confidence = Math.max(0, 100 - (stdDev * 10)); // Lower stdDev = higher confidence
      }
      // Biweekly: avg 14 days ± 4 days
      else if (avgInterval >= 10 && avgInterval <= 18) {
        frequency = 'biweekly';
        confidence = Math.max(0, 100 - (stdDev * 8));
      }
      // Monthly: avg 30 days ± 7 days
      else if (avgInterval >= 23 && avgInterval <= 37) {
        frequency = 'monthly';
        confidence = Math.max(0, 100 - (stdDev * 5));
      }

      // Find typical day of week (most common)
      const dayOfWeekCounts: Record<number, number> = {};
      for (const pickup of pickups) {
        const day = new Date(pickup.pickup_date).getDay();
        dayOfWeekCounts[day] = (dayOfWeekCounts[day] || 0) + 1;
      }
      const typicalDayOfWeek = Object.entries(dayOfWeekCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      // Find typical week of month
      const weekOfMonthCounts: Record<number, number> = {};
      for (const pickup of pickups) {
        const date = new Date(pickup.pickup_date);
        const dayOfMonth = date.getDate();
        const weekOfMonth = Math.ceil(dayOfMonth / 7);
        weekOfMonthCounts[weekOfMonth] = (weekOfMonthCounts[weekOfMonth] || 0) + 1;
      }
      const typicalWeekOfMonth = Object.entries(weekOfMonthCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      const lastPickupDate = pickups[pickups.length - 1].pickup_date;

      const pattern: PickupPattern = {
        client_id: client.id,
        frequency,
        confidence_score: Math.round(confidence),
        typical_day_of_week: typicalDayOfWeek ? parseInt(typicalDayOfWeek) : null,
        typical_week_of_month: typicalWeekOfMonth ? parseInt(typicalWeekOfMonth) : null,
        last_pickup_date: lastPickupDate,
        average_days_between_pickups: Math.round(avgInterval * 10) / 10,
        total_pickups_analyzed: pickups.length,
      };

      // Only store patterns with reasonable confidence
      if (frequency !== 'irregular' && confidence >= 50) {
        patterns.push(pattern);
        patternsFound++;
        console.log(`[PATTERN_ANALYSIS] ${client.company_name}: ${frequency} (confidence: ${Math.round(confidence)}%)`);
      } else {
        console.log(`[PATTERN_ANALYSIS] ${client.company_name}: Irregular pattern (avg ${avgInterval.toFixed(1)} days)`);
      }
    }

    // Upsert patterns into database
    if (patterns.length > 0) {
      const { error: upsertError } = await supabase
        .from('client_pickup_patterns')
        .upsert(
          patterns.map(p => ({
            ...p,
            organization_id,
            last_analyzed_at: new Date().toISOString(),
          })),
          { onConflict: 'organization_id,client_id' }
        );

      if (upsertError) throw upsertError;
    }

    console.log(`[PATTERN_ANALYSIS] Complete: ${analyzed} clients analyzed, ${patternsFound} patterns found`);

    return new Response(
      JSON.stringify({
        success: true,
        clients_analyzed: analyzed,
        patterns_found: patternsFound,
        patterns,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[PATTERN_ANALYSIS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
