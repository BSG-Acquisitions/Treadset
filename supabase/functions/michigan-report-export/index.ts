import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  year: number;
  format: 'csv' | 'pdf';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { year, format }: ExportRequest = await req.json();
    
    console.log(`Exporting Michigan report for ${year} as ${format}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pickup data for the year
    const { data: pickups, error: pickupsError } = await supabase
      .from('pickups')
      .select(`
        *,
        clients!inner(
          id,
          company_name,
          county,
          city,
          state
        ),
        locations(
          id,
          name,
          address
        )
      `)
      .eq('status', 'completed')
      .gte('pickup_date', `${year}-01-01`)
      .lte('pickup_date', `${year}-12-31`);

    if (pickupsError) {
      throw new Error(`Failed to fetch pickups: ${pickupsError.message}`);
    }

    // Calculate report data
    let totalPTE = 0;
    const byCounty: Record<string, number> = {};
    const monthlyData: Record<number, { pte: number; pickups: number }> = {};

    pickups?.forEach(pickup => {
      // Michigan PTE multipliers: passenger = 1, semi/commercial = 5, OTR/farm-tractor = 15.
      // Pre-2026-05 rows entered tractor as semi via the wizard; backfill migrated those
      // values into semi_count, so tractor_count here is true farm-tractor (15 PTE class).
      const pickupPTE =
        (pickup.pte_count || 0) +
        (pickup.semi_count || 0) * 5 +
        (pickup.otr_count || 0) * 15 +
        (pickup.tractor_count || 0) * 15;
      totalPTE += pickupPTE;

      const county = pickup.clients?.county || 'Unknown';
      byCounty[county] = (byCounty[county] || 0) + pickupPTE;

      const month = new Date(pickup.pickup_date).getMonth() + 1;
      if (!monthlyData[month]) {
        monthlyData[month] = { pte: 0, pickups: 0 };
      }
      monthlyData[month].pte += pickupPTE;
      monthlyData[month].pickups += 1;
    });

    const totalTons = Math.round(totalPTE / 89 * 100) / 100;
    const totalCubicYards = Math.round(totalPTE * 0.1 * 10) / 10;

    if (format === 'csv') {
      // Generate CSV content
      let csvContent = `Michigan Tire Report - ${year}\n\n`;
      csvContent += `Summary Totals\n`;
      csvContent += `Total PTEs,${totalPTE}\n`;
      csvContent += `Total Tons (89 PTE/ton),${totalTons}\n`;
      csvContent += `Total Cubic Yards,${totalCubicYards}\n\n`;
      
      csvContent += `County Breakdown\n`;
      csvContent += `County,PTEs,Tons\n`;
      Object.entries(byCounty).forEach(([county, pte]) => {
        csvContent += `${county},${pte},${Math.round(pte / 89 * 100) / 100}\n`;
      });

      csvContent += `\nMonthly Breakdown\n`;
      csvContent += `Month,PTEs,Tons,Pickups\n`;
      for (let i = 1; i <= 12; i++) {
        const data = monthlyData[i] || { pte: 0, pickups: 0 };
        const monthName = new Date(year, i - 1, 1).toLocaleString('default', { month: 'long' });
        csvContent += `${monthName},${data.pte},${Math.round(data.pte / 89 * 100) / 100},${data.pickups}\n`;
      }

      return new Response(csvContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="michigan_tire_report_${year}.csv"`
        }
      });
    } else {
      // For PDF, return a simple text representation for now
      let pdfContent = `Michigan Tire Report - ${year}\n\n`;
      pdfContent += `Total PTEs: ${totalPTE}\n`;
      pdfContent += `Total Tons: ${totalTons}\n`;
      pdfContent += `Total Cubic Yards: ${totalCubicYards}\n\n`;
      pdfContent += `County Breakdown:\n`;
      Object.entries(byCounty).forEach(([county, pte]) => {
        pdfContent += `${county}: ${pte} PTEs (${Math.round(pte / 89 * 100) / 100} tons)\n`;
      });

      return new Response(pdfContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="michigan_tire_report_${year}.txt"`
        }
      });
    }

  } catch (error: any) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);