import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting revenue recalculation for client summaries with missing revenue...');

    // Get all client summaries with zero revenue but non-zero data
    const { data: summariesWithMissingRevenue, error: fetchError } = await supabase
      .from('client_summaries')
      .select('id, client_id, year, month, total_revenue')
      .eq('total_revenue', 0)
      .gt('total_pickups', 0);

    if (fetchError) {
      throw new Error(`Error fetching client summaries: ${fetchError.message}`);
    }

    if (!summariesWithMissingRevenue || summariesWithMissingRevenue.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No client summaries found with missing revenue',
          updated: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${summariesWithMissingRevenue.length} client summaries with missing revenue`);

    // For each summary, get actual pickup revenue for that client/period
    const updates = [];
    for (const summary of summariesWithMissingRevenue) {
      const startDate = new Date(summary.year, summary.month - 1, 1);
      const endDate = new Date(summary.year, summary.month, 0, 23, 59, 59);

      const { data: pickups } = await supabase
        .from('pickups')
        .select('final_revenue, computed_revenue')
        .eq('client_id', summary.client_id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Sum up actual revenue from pickups
      const actualRevenue = pickups?.reduce((sum, p) => 
        sum + (p.final_revenue || p.computed_revenue || 0), 0
      ) || 0;

      updates.push({
        id: summary.id,
        total_revenue: actualRevenue
      });
    }

    // Batch update all summaries
    const { data: updatedSummaries, error: updateError } = await supabase
      .from('client_summaries')
      .upsert(updates)
      .select();

    if (updateError) {
      throw new Error(`Error updating client summaries: ${updateError.message}`);
    }

    console.log(`Successfully updated ${updatedSummaries?.length || 0} client summaries with computed revenue`);

    // Calculate total revenue added
    const totalRevenueAdded = updates.reduce((sum, update) => sum + update.total_revenue, 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully updated ${updatedSummaries?.length || 0} client summaries`,
        updated: updatedSummaries?.length || 0,
        total_revenue_added: totalRevenueAdded,
        average_revenue_per_summary: totalRevenueAdded / (updatedSummaries?.length || 1)
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});