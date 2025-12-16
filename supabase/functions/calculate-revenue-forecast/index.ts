import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Read optional organizationId from request body
    const { organizationId } = await req.json().catch(() => ({ organizationId: undefined }));

    // Use last 12 months of data for improved model training
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const dataRangeStart = twelveMonthsAgo.toISOString().split('T')[0];

    // Query completed pickups with actual revenue, scoped to org when provided
    let pickupsQuery = supabaseClient
      .from('pickups')
      .select('created_at, final_revenue, computed_revenue, organization_id')
      .eq('status', 'completed')
      .gte('created_at', twelveMonthsAgo.toISOString())
      .order('created_at', { ascending: true });

    if (organizationId) {
      pickupsQuery = pickupsQuery.eq('organization_id', organizationId);
    }

    const { data: pickups, error: pickupsError } = await pickupsQuery;
    if (pickupsError) throw pickupsError;

    // Query dropoffs with actual revenue
    let dropoffsQuery = supabaseClient
      .from('dropoffs')
      .select('created_at, computed_revenue, organization_id')
      .gte('created_at', twelveMonthsAgo.toISOString())
      .order('created_at', { ascending: true });

    if (organizationId) {
      dropoffsQuery = dropoffsQuery.eq('organization_id', organizationId);
    }

    const { data: dropoffs, error: dropoffsError } = await dropoffsQuery;
    if (dropoffsError) throw dropoffsError;

    // Calculate monthly revenue totals from BOTH pickups AND dropoffs
    const monthlyPickupRevenue: { [key: string]: number } = {};
    const monthlyDropoffRevenue: { [key: string]: number } = {};
    const monthlyTotalRevenue: { [key: string]: number } = {};
    
    // Process pickup revenue
    pickups?.forEach((pickup: any) => {
      const month = pickup.created_at.substring(0, 7); // YYYY-MM
      const revenue = pickup.final_revenue || pickup.computed_revenue || 0;
      
      monthlyPickupRevenue[month] = (monthlyPickupRevenue[month] || 0) + revenue;
      monthlyTotalRevenue[month] = (monthlyTotalRevenue[month] || 0) + revenue;
    });

    // Process dropoff revenue
    dropoffs?.forEach((dropoff: any) => {
      const month = dropoff.created_at.substring(0, 7); // YYYY-MM
      const revenue = dropoff.computed_revenue || 0;
      
      monthlyDropoffRevenue[month] = (monthlyDropoffRevenue[month] || 0) + revenue;
      monthlyTotalRevenue[month] = (monthlyTotalRevenue[month] || 0) + revenue;
    });

    // Calculate rolling averages and forecasts using combined data
    const months = Object.keys(monthlyTotalRevenue).sort();
    const revenues = months.map(m => monthlyTotalRevenue[m]);
    
    // Simple moving average for trend
    const avgMonthlyRevenue = revenues.length > 0 
      ? revenues.reduce((a, b) => a + b, 0) / revenues.length 
      : 0;
    
    // Calculate growth rate from last 3 months vs previous 3 months
    const recentRevenue = revenues.slice(-3).reduce((a, b) => a + b, 0);
    const previousRevenue = revenues.slice(-6, -3).reduce((a, b) => a + b, 0);
    const growthRate = previousRevenue > 0 
      ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    // Seasonal adjustment (simple: use month-over-month variance)
    const seasonalWeight = revenues.length > 3 
      ? 1 + (revenues[revenues.length - 1] - avgMonthlyRevenue) / (avgMonthlyRevenue || 1)
      : 1;

    // Calculate pickup vs dropoff breakdown for the most recent 3 months
    const recentMonths = months.slice(-3);
    const pickupTotal = recentMonths.reduce((sum, m) => sum + (monthlyPickupRevenue[m] || 0), 0);
    const dropoffTotal = recentMonths.reduce((sum, m) => sum + (monthlyDropoffRevenue[m] || 0), 0);
    const combinedTotal = pickupTotal + dropoffTotal;
    const pickupPercentage = combinedTotal > 0 ? Math.round((pickupTotal / combinedTotal) * 100) : 0;
    const dropoffPercentage = combinedTotal > 0 ? Math.round((dropoffTotal / combinedTotal) * 100) : 0;

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
      const variance = revenues.length > 0 
        ? revenues.reduce((sum, r) => sum + Math.pow(r - avgMonthlyRevenue, 2), 0) / revenues.length 
        : 0;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = avgMonthlyRevenue > 0 ? stdDev / avgMonthlyRevenue : 1;
      
      // Confidence explanation
      let confidence: string;
      let confidenceExplanation: string;
      if (coefficientOfVariation < 0.2) {
        confidence = 'high';
        confidenceExplanation = 'Your revenue is very consistent month-to-month, making predictions reliable.';
      } else if (coefficientOfVariation < 0.4) {
        confidence = 'medium';
        confidenceExplanation = 'Your revenue varies moderately, predictions are reasonably reliable.';
      } else {
        confidence = 'low';
        confidenceExplanation = 'Your revenue varies significantly month-to-month, predictions may be less accurate.';
      }

      return {
        forecast_month: targetDate.toISOString().substring(0, 10),
        predicted_revenue: Math.round(predicted * 100) / 100,
        confidence_level: confidence,
        confidence_explanation: confidenceExplanation,
        based_on_months: revenues.length,
        growth_rate: Math.round(growthRate * 100) / 100,
        pickup_revenue_pct: pickupPercentage,
        dropoff_revenue_pct: dropoffPercentage,
        avg_monthly_pickups: Math.round(pickupTotal / Math.max(recentMonths.length, 1) * 100) / 100,
        avg_monthly_dropoffs: Math.round(dropoffTotal / Math.max(recentMonths.length, 1) * 100) / 100,
      };
    });

    // Store forecasts in revenue_forecasts table
    let targetOrgId: string | null = organizationId || (pickups && pickups.length > 0 ? (pickups[0] as any).organization_id : null);

    if (!targetOrgId && dropoffs && dropoffs.length > 0) {
      targetOrgId = (dropoffs[0] as any).organization_id;
    }

    if (!targetOrgId) {
      const { data: fallbackOrg } = await supabaseClient
        .from('organizations')
        .select('id')
        .limit(1)
        .single();
      targetOrgId = fallbackOrg?.id || null;
    }

    if (targetOrgId) {
      // Delete old forecasts
      await supabaseClient
        .from('revenue_forecasts')
        .delete()
        .eq('organization_id', targetOrgId);

      // Insert new forecasts
      const forecastsToInsert = forecasts.map(f => ({
        forecast_month: f.forecast_month,
        predicted_revenue: f.predicted_revenue,
        confidence_level: f.confidence_level,
        based_on_months: f.based_on_months,
        growth_rate: f.growth_rate,
        organization_id: targetOrgId as string,
      }));

      const { error: insertError } = await supabaseClient
        .from('revenue_forecasts')
        .insert(forecastsToInsert);

      if (insertError) throw insertError;

      // Log model training metrics
      const trainingDuration = Date.now() - trainingStart;
      const actualRevenues = revenues.slice(-3);
      const predictedRevenue = forecasts[0].predicted_revenue;
      const mae = actualRevenues.length > 0 
        ? Math.abs(actualRevenues[actualRevenues.length - 1] - predictedRevenue) 
        : 0;
      const mape = actualRevenues.length > 0 && actualRevenues[actualRevenues.length - 1] > 0 
        ? (mae / actualRevenues[actualRevenues.length - 1]) * 100 
        : 0;

      await supabaseClient.from('model_training_logs').insert({
        organization_id: targetOrgId,
        model_name: 'revenue_forecast',
        model_version: 'v3.0-combined-revenue',
        data_range_start: dataRangeStart,
        data_range_end: new Date().toISOString().split('T')[0],
        records_used: (pickups?.length || 0) + (dropoffs?.length || 0),
        performance_metrics: {
          mae: Math.round(mae * 100) / 100,
          mape: Math.round(mape * 100) / 100,
          growth_rate: Math.round(growthRate * 100) / 100,
          seasonal_weight: Math.round(seasonalWeight * 100) / 100,
          confidence_levels: forecasts.map(f => f.confidence_level),
          pickup_revenue_pct: pickupPercentage,
          dropoff_revenue_pct: dropoffPercentage,
        },
        hyperparameters: {
          lookback_months: 12,
          seasonal_adjustment: true,
          revenue_sources: ['pickups', 'dropoffs'],
        },
        training_duration_ms: trainingDuration,
        deployed: true,
        notes: 'Combined pickup + dropoff revenue with 12-month historical data and seasonal adjustment'
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
          training_duration_ms: Date.now() - trainingStart,
          pickupRevenueContribution: pickupPercentage,
          dropoffRevenueContribution: dropoffPercentage,
          totalPickupsAnalyzed: pickups?.length || 0,
          totalDropoffsAnalyzed: dropoffs?.length || 0,
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
