import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManifestData {
  created_at: string;
  total: number;
  pte_on_rim: number;
  pte_off_rim: number;
  otr_count: number;
  tractor_count: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const trainingStart = Date.now();

    // Get organization settings for default rates
    const { data: orgSettings } = await supabaseClient
      .from('organization_settings')
      .select('default_pte_rate, default_otr_rate, default_tractor_rate, organization_id')
      .single();

    const pteRate = orgSettings?.default_pte_rate || 25.00;
    const otrRate = orgSettings?.default_otr_rate || 45.00;
    const tractorRate = orgSettings?.default_tractor_rate || 35.00;

    // Use last 12 months of data for improved model training
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const dataRangeStart = twelveMonthsAgo.toISOString().split('T')[0];

    const { data: manifests, error: manifestError } = await supabaseClient
      .from('manifests')
      .select('created_at, total, pte_on_rim, pte_off_rim, otr_count, tractor_count')
      .in('status', ['COMPLETED', 'AWAITING_RECEIVER_SIGNATURE'])
      .gte('created_at', twelveMonthsAgo.toISOString())
      .order('created_at', { ascending: true });

    if (manifestError) throw manifestError;

    // Calculate monthly revenue totals
    const monthlyRevenue: { [key: string]: number } = {};
    
    (manifests as ManifestData[])?.forEach((manifest) => {
      const month = manifest.created_at.substring(0, 7); // YYYY-MM
      const revenue = manifest.total > 0 
        ? manifest.total 
        : (
          ((manifest.pte_on_rim || 0) + (manifest.pte_off_rim || 0)) * pteRate +
          (manifest.otr_count || 0) * otrRate +
          (manifest.tractor_count || 0) * tractorRate
        );
      
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + revenue;
    });

    // Calculate rolling averages and forecasts
    const months = Object.keys(monthlyRevenue).sort();
    const revenues = months.map(m => monthlyRevenue[m]);
    
    // Simple moving average for trend
    const avgMonthlyRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    
    // Calculate growth rate from last 3 months vs previous 3 months
    const recentRevenue = revenues.slice(-3).reduce((a, b) => a + b, 0);
    const previousRevenue = revenues.slice(-6, -3).reduce((a, b) => a + b, 0);
    const growthRate = previousRevenue > 0 
      ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    // Seasonal adjustment (simple: use month-over-month variance)
    const seasonalWeight = revenues.length > 3 
      ? 1 + (revenues[revenues.length - 1] - avgMonthlyRevenue) / avgMonthlyRevenue 
      : 1;

    // Generate forecasts for 30, 60, 90 days
    const now = new Date();
    const forecasts = [30, 60, 90].map(days => {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      
      const monthsAhead = days / 30;
      const baseRevenue = avgMonthlyRevenue * (monthsAhead);
      const trendAdjustment = baseRevenue * (growthRate / 100);
      const seasonalAdjustment = baseRevenue * (seasonalWeight - 1);
      
      const predicted = baseRevenue + trendAdjustment + seasonalAdjustment;
      
      // Confidence level based on data consistency
      const variance = revenues.reduce((sum, r) => sum + Math.pow(r - avgMonthlyRevenue, 2), 0) / revenues.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / avgMonthlyRevenue;
      
      let confidence: string;
      if (coefficientOfVariation < 0.2) confidence = 'high';
      else if (coefficientOfVariation < 0.4) confidence = 'medium';
      else confidence = 'low';

      return {
        forecast_month: targetDate.toISOString().substring(0, 10),
        predicted_revenue: Math.round(predicted * 100) / 100,
        confidence_level: confidence,
        based_on_months: revenues.length,
        growth_rate: Math.round(growthRate * 100) / 100,
      };
    });

    // Store forecasts in revenue_forecasts table
    const { data: orgData } = await supabaseClient
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (orgData) {
      // Delete old forecasts
      await supabaseClient
        .from('revenue_forecasts')
        .delete()
        .eq('organization_id', orgData.id);

      // Insert new forecasts
      const forecastsToInsert = forecasts.map(f => ({
        ...f,
        organization_id: orgData.id,
      }));

      const { error: insertError } = await supabaseClient
        .from('revenue_forecasts')
        .insert(forecastsToInsert);

      if (insertError) throw insertError;

      // Log model training metrics
      const trainingDuration = Date.now() - trainingStart;
      const actualRevenues = revenues.slice(-3); // Last 3 months actual
      const predictedRevenue = forecasts[0].predicted_revenue;
      const mae = Math.abs(actualRevenues[actualRevenues.length - 1] - predictedRevenue);
      const mape = (mae / actualRevenues[actualRevenues.length - 1]) * 100;

      await supabaseClient.from('model_training_logs').insert({
        organization_id: orgData.id,
        model_name: 'revenue_forecast',
        model_version: 'v2.0-12month',
        data_range_start: dataRangeStart,
        data_range_end: new Date().toISOString().split('T')[0],
        records_used: manifests?.length || 0,
        performance_metrics: {
          mae: Math.round(mae * 100) / 100,
          mape: Math.round(mape * 100) / 100,
          growth_rate: Math.round(growthRate * 100) / 100,
          seasonal_weight: Math.round(seasonalWeight * 100) / 100,
          confidence_levels: forecasts.map(f => f.confidence_level)
        },
        hyperparameters: {
          lookback_months: 12,
          seasonal_adjustment: true,
          pte_rate: pteRate,
          otr_rate: otrRate,
          tractor_rate: tractorRate
        },
        training_duration_ms: trainingDuration,
        deployed: true,
        notes: 'Enhanced with 12-month historical data and seasonal adjustment'
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        forecasts,
        summary: {
          avgMonthlyRevenue: Math.round(avgMonthlyRevenue * 100) / 100,
          growthRate: Math.round(growthRate * 100) / 100,
          dataPoints: revenues.length,
          seasonalWeight: Math.round(seasonalWeight * 100) / 100,
          training_duration_ms: Date.now() - trainingStart
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error calculating revenue forecast:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
