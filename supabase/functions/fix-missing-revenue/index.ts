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

    console.log('Starting revenue calculation for client summaries with missing revenue...');

    // Get organization default rates
    const { data: orgSettings, error: orgError } = await supabase
      .from('organization_settings')
      .select('default_pte_rate, default_otr_rate, default_tractor_rate')
      .limit(1);

    if (orgError || !orgSettings || orgSettings.length === 0) {
      throw new Error('Could not fetch organization settings');
    }

    const settings = orgSettings[0];
    const pteRate = settings.default_pte_rate || 25;
    const otrRate = settings.default_otr_rate || 45;
    const tractorRate = settings.default_tractor_rate || 35;

    console.log(`Using rates: PTE=$${pteRate}, OTR=$${otrRate}, Tractor=$${tractorRate}`);

    // Get all client summaries with zero revenue but non-zero PTEs
    const { data: summariesWithMissingRevenue, error: fetchError } = await supabase
      .from('client_summaries')
      .select('id, total_ptes, total_otr, total_tractor, total_revenue')
      .eq('total_revenue', 0)
      .gt('total_ptes', 0);

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

    // Calculate and update revenue for each summary
    const updates = summariesWithMissingRevenue.map(summary => {
      const computedRevenue = 
        (summary.total_ptes * pteRate) +
        (summary.total_otr * otrRate) +
        (summary.total_tractor * tractorRate);

      return {
        id: summary.id,
        total_revenue: computedRevenue
      };
    });

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

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});