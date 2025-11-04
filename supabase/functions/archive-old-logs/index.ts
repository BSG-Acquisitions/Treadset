import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting log archival process...');

    // Calculate cutoff date (90 days ago)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffDate = ninetyDaysAgo.toISOString();

    // Fetch logs older than 90 days
    const { data: oldLogs, error: fetchError } = await supabase
      .from('ai_query_logs')
      .select('*')
      .lt('created_at', cutoffDate)
      .order('created_at', { ascending: true })
      .limit(1000); // Process in batches

    if (fetchError) {
      throw new Error(`Failed to fetch old logs: ${fetchError.message}`);
    }

    if (!oldLogs || oldLogs.length === 0) {
      console.log('No logs to archive');
      return new Response(
        JSON.stringify({ 
          success: true,
          archived: 0,
          message: 'No logs older than 90 days found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${oldLogs.length} logs to archive`);

    // Prepare archive records
    const archiveRecords = oldLogs.map(log => ({
      id: log.id,
      user_id: log.user_id,
      organization_id: log.organization_id,
      query_text: log.query_text,
      response_summary: log.response_summary,
      query_type: log.query_type,
      execution_time_ms: log.execution_time_ms,
      success: log.success,
      error_message: log.error_message,
      created_at: log.created_at
    }));

    // Insert into archive table
    const { error: insertError } = await supabase
      .from('ai_query_logs_archive')
      .insert(archiveRecords);

    if (insertError) {
      throw new Error(`Failed to insert into archive: ${insertError.message}`);
    }

    // Delete from original table
    const logIds = oldLogs.map(log => log.id);
    const { error: deleteError } = await supabase
      .from('ai_query_logs')
      .delete()
      .in('id', logIds);

    if (deleteError) {
      throw new Error(`Failed to delete archived logs: ${deleteError.message}`);
    }

    console.log(`Successfully archived ${oldLogs.length} logs`);

    // Log to system_updates
    await supabase.from('system_updates').insert({
      organization_id: oldLogs[0].organization_id,
      module_name: 'log_archival',
      status: 'live',
      notes: `Archived ${oldLogs.length} AI query logs older than 90 days`,
      impacted_tables: ['ai_query_logs', 'ai_query_logs_archive'],
      test_results: {
        archived_count: oldLogs.length,
        cutoff_date: cutoffDate,
        oldest_archived: oldLogs[0].created_at,
        newest_archived: oldLogs[oldLogs.length - 1].created_at
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        archived: oldLogs.length,
        cutoff_date: cutoffDate
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Log archival error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
