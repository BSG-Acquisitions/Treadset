import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessedSummaryData {
  client_summaries: any[];
  errors: string[];
  fuzzy_matches: Array<{
    row: number;
    csv_name: string;
    matched_name: string;
  }>;
}

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

    const { csvData } = await req.json();
    
    if (!csvData) {
      return new Response(
        JSON.stringify({ error: 'CSV data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing client summary CSV data...');

    // Parse CSV data
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'));
    console.log('CSV headers:', headers);

    const processedData: ProcessedSummaryData = {
      client_summaries: [],
      errors: [],
      fuzzy_matches: []
    };

    // Get organization ID
    const orgId = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73';

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1;
      try {
        const values = lines[i].split(',').map((v: string) => v.trim().replace(/^["']|["']$/g, ''));
        
        if (values.length < headers.length) {
          processedData.errors.push(`Row ${rowNum}: Insufficient columns`);
          continue;
        }

        const row: { [key: string]: string } = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        console.log(`Processing row ${rowNum}:`, row);

        // Extract client name/identifier
        const clientName = row.client_name || row.company_name || row.client || '';
        if (!clientName) {
          processedData.errors.push(`Row ${rowNum}: Client name is required`);
          continue;
        }

        // Find matching client with fuzzy matching
        let { data: clients, error: clientError } = await supabase
          .from('clients')
          .select('id, company_name')
          .eq('company_name', clientName)
          .eq('organization_id', orgId)
          .limit(1);

        // If exact match fails, try fuzzy matching
        if (!clients || clients.length === 0) {
          const { data: allClients, error: allClientsError } = await supabase
            .from('clients')
            .select('id, company_name')
            .eq('organization_id', orgId);

          if (!allClientsError && allClients) {
            // Try to find partial matches
            const normalizedClientName = clientName.toLowerCase().trim();
            const matchedClient = allClients.find(client => {
              const normalizedDbName = client.company_name.toLowerCase().trim();
              return normalizedDbName.includes(normalizedClientName) || 
                     normalizedClientName.includes(normalizedDbName) ||
                     // Check for common variations
                     normalizedDbName.replace(/\s+/g, '') === normalizedClientName.replace(/\s+/g, '') ||
                     normalizedDbName.replace(/[&,.-]/g, '') === normalizedClientName.replace(/[&,.-]/g, '');
            });

            if (matchedClient) {
              clients = [matchedClient];
              console.log(`Fuzzy matched "${clientName}" to "${matchedClient.company_name}"`);
              processedData.fuzzy_matches.push({
                row: rowNum,
                csv_name: clientName,
                matched_name: matchedClient.company_name
              });
            }
          }
        }

        if (clientError) {
          console.error('Client lookup error:', clientError);
          processedData.errors.push(`Row ${rowNum}: Database error looking up client`);
          continue;
        }

        if (!clients || clients.length === 0) {
          processedData.errors.push(`Row ${rowNum}: Client "${clientName}" not found - no exact or partial match`);
          continue;
        }

        const clientId = clients[0].id;

        // Parse summary data
        const year = parseInt(row.year || '2025');
        const month = row.month ? parseInt(row.month) : null;
        const totalPickups = parseInt(row.total_pickups || row.pickups || '0');
        const totalPtes = parseInt(row.total_ptes || row.ptes || '0');
        const totalOtr = parseInt(row.total_otr || row.otr || '0');
        const totalTractor = parseInt(row.total_tractor || row.tractor || '0');
        const totalRevenue = parseFloat(row.total_revenue || row.revenue || '0');
        const totalWeightTons = parseFloat(row.total_weight_tons || row.weight_tons || row.tons || '0');
        const totalVolumeYards = parseFloat(row.total_volume_yards || row.volume_yards || row.yards || '0');

        // Parse dates
        const firstPickupDate = row.first_pickup_date || row.first_pickup || null;
        const lastPickupDate = row.last_pickup_date || row.last_pickup || null;

        const summaryData = {
          client_id: clientId,
          year,
          month,
          total_pickups: totalPickups,
          total_ptes: totalPtes,
          total_otr: totalOtr,
          total_tractor: totalTractor,
          total_revenue: totalRevenue,
          total_weight_tons: totalWeightTons,
          total_volume_yards: totalVolumeYards,
          first_pickup_date: firstPickupDate,
          last_pickup_date: lastPickupDate,
          notes: row.notes || '',
          organization_id: orgId
        };

        processedData.client_summaries.push(summaryData);

      } catch (error) {
        console.error(`Error processing row ${rowNum}:`, error);
        processedData.errors.push(`Row ${rowNum}: ${error.message}`);
      }
    }

    console.log(`Processed ${processedData.client_summaries.length} client summaries`);

    // Insert client summaries
    if (processedData.client_summaries.length > 0) {
      const { data: insertedSummaries, error: insertError } = await supabase
        .from('client_summaries')
        .upsert(processedData.client_summaries, {
          onConflict: 'client_id,year,month,organization_id'
        })
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to insert client summaries', 
            details: insertError.message,
            processed: processedData.client_summaries.length,
            errors: processedData.errors
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Successfully inserted/updated ${insertedSummaries?.length || 0} client summaries`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${processedData.client_summaries.length} client summaries`,
        processed: processedData.client_summaries.length,
        errors: processedData.errors,
        fuzzy_matches: processedData.fuzzy_matches,
        skipped_entries: processedData.errors.filter(e => e.includes('not found')).length
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