import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

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

    console.log('[CLEANUP] Starting duplicate notification cleanup...');

    // Get all notifications
    const { data: allNotifications, error: fetchError } = await supabase
      .from('notifications')
      .select('id, user_id, title, type, related_id, created_at')
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    // Find duplicates - keep oldest per (user_id, title, type, related_id)
    const seen = new Map<string, string>();
    const idsToDelete: string[] = [];

    for (const notif of allNotifications || []) {
      const key = `${notif.user_id}|${notif.title}|${notif.type}|${notif.related_id || 'null'}`;
      
      if (seen.has(key)) {
        // This is a duplicate, mark for deletion
        idsToDelete.push(notif.id);
      } else {
        // First occurrence, keep it
        seen.set(key, notif.id);
      }
    }

    console.log(`[CLEANUP] Found ${idsToDelete.length} duplicates to delete out of ${allNotifications?.length || 0} total`);

    // Delete in batches of 100
    let deletedCount = 0;
    for (let i = 0; i < idsToDelete.length; i += 100) {
      const batch = idsToDelete.slice(i, i + 100);
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error(`[CLEANUP] Error deleting batch:`, deleteError);
      } else {
        deletedCount += batch.length;
      }
    }

    console.log(`[CLEANUP] Deleted ${deletedCount} duplicate notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        total_before: allNotifications?.length || 0,
        duplicates_found: idsToDelete.length,
        deleted: deletedCount,
        remaining: (allNotifications?.length || 0) - deletedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[CLEANUP] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

