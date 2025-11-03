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

    // Get organization settings for default rates
    const { data: orgSettings } = await supabaseClient
      .from('organization_settings')
      .select('default_pte_rate, default_otr_rate, default_tractor_rate')
      .single();

    const pteRate = orgSettings?.default_pte_rate || 25.00;
    const otrRate = orgSettings?.default_otr_rate || 45.00;
    const tractorRate = orgSettings?.default_tractor_rate || 35.00;

    // Get last 6 months of completed manifests for forecasting
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: manifests, error: manifestError } = await supabaseClient
      .from('manifests')
      .select('created_at, total, pte_on_rim, pte_off_rim, otr_count, tractor_count')
      .in('status', ['COMPLETED', 'AWAITING_RECEIVER_SIGNATURE'])
      .gte('created_at', sixMonthsAgo.toISOString())
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

    // Store forecasts in revenue_forecasts_beta table
    const { data: orgData } = await supabaseClient
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (orgData) {
      // Delete old forecasts
      await supabaseClient
        .from('revenue_forecasts_beta')
        .delete()
        .eq('organization_id', orgData.id);

      // Insert new forecasts
      const forecastsToInsert = forecasts.map(f => ({
        ...f,
        organization_id: orgData.id,
      }));

      const { error: insertError } = await supabaseClient
        .from('revenue_forecasts_beta')
        .insert(forecastsToInsert);

      if (insertError) throw insertError;
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
