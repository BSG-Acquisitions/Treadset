import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PickupPattern {
  clientId: string;
  clientName: string;
  totalPickups: number;
  firstPickupDate: string | null;
  lastPickupDate: string | null;
  averageDaysBetweenPickups: number | null;
  daysSinceLastPickup: number | null;
  expectedNextPickup: string | null;
  isOverdue: boolean;
  overdueByDays: number | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting pickup pattern analysis...');

    // Get all active clients with their pickup history
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select(`
        id,
        company_name,
        pickups!pickups_client_id_fkey(
          id,
          pickup_date,
          status,
          created_at
        )
      `)
      .eq('is_active', true)
      .order('company_name');

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      throw clientsError;
    }

    console.log(`Analyzing ${clients?.length || 0} clients...`);

    const patterns: PickupPattern[] = [];
    const notifications: any[] = [];
    const today = new Date();

    for (const client of clients || []) {
      const pickups = (client.pickups || [])
        .filter((p: any) => p.status === 'completed')
        .sort((a: any, b: any) => 
          new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime()
        );

      if (pickups.length === 0) {
        // No pickup history - skip this client
        continue;
      }

      const firstPickup = pickups[0];
      const lastPickup = pickups[pickups.length - 1];
      const lastPickupDate = new Date(lastPickup.pickup_date);
      const daysSinceLastPickup = Math.floor(
        (today.getTime() - lastPickupDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate average days between pickups
      let averageDaysBetween: number | null = null;
      let expectedNextPickup: string | null = null;
      let isOverdue = false;
      let overdueByDays: number | null = null;

      if (pickups.length >= 2) {
        // Calculate intervals between consecutive pickups
        const intervals: number[] = [];
        for (let i = 1; i < pickups.length; i++) {
          const prev = new Date(pickups[i - 1].pickup_date);
          const curr = new Date(pickups[i].pickup_date);
          const daysBetween = Math.floor(
            (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
          );
          intervals.push(daysBetween);
        }

        // Calculate average interval
        averageDaysBetween = Math.round(
          intervals.reduce((sum, val) => sum + val, 0) / intervals.length
        );

        // Calculate expected next pickup date
        const expectedDate = new Date(lastPickupDate);
        expectedDate.setDate(expectedDate.getDate() + averageDaysBetween);
        expectedNextPickup = expectedDate.toISOString().split('T')[0];

        // Check if overdue (with 7-day grace period)
        const gracePeriodDays = 7;
        isOverdue = daysSinceLastPickup > (averageDaysBetween + gracePeriodDays);
        
        if (isOverdue) {
          overdueByDays = daysSinceLastPickup - averageDaysBetween;
        }
      } else {
        // Only one pickup - use a default 30-day interval
        averageDaysBetween = 30;
        const expectedDate = new Date(lastPickupDate);
        expectedDate.setDate(expectedDate.getDate() + 30);
        expectedNextPickup = expectedDate.toISOString().split('T')[0];
        isOverdue = daysSinceLastPickup > 37; // 30 + 7 grace period
        
        if (isOverdue) {
          overdueByDays = daysSinceLastPickup - 30;
        }
      }

      const pattern: PickupPattern = {
        clientId: client.id,
        clientName: client.company_name,
        totalPickups: pickups.length,
        firstPickupDate: firstPickup.pickup_date,
        lastPickupDate: lastPickup.pickup_date,
        averageDaysBetweenPickups: averageDaysBetween,
        daysSinceLastPickup,
        expectedNextPickup,
        isOverdue,
        overdueByDays,
      };

      patterns.push(pattern);

      // Create notification for overdue clients
      if (isOverdue && overdueByDays) {
        // Check if there's already a recent notification for this client
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('related_type', 'client_followup')
          .eq('related_id', client.id)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (!existingNotif) {
          // Get organization_id from client
          const { data: clientData } = await supabase
            .from('clients')
            .select('organization_id')
            .eq('id', client.id)
            .single();

          if (clientData) {
            notifications.push({
              organization_id: clientData.organization_id,
              type: 'warning',
              title: `${client.company_name} Overdue for Pickup`,
              message: `${client.company_name} hasn't been scheduled in ${daysSinceLastPickup} days. Their typical interval is ${averageDaysBetween} days. Consider reaching out to schedule their next pickup.`,
              related_type: 'client_followup',
              related_id: client.id,
              created_at: new Date().toISOString(),
            });
          }
        }
      }

      // Update client_workflows with the calculated pattern
      const { data: existingWorkflow } = await supabase
        .from('client_workflows')
        .select('id')
        .eq('client_id', client.id)
        .eq('workflow_type', 'followup')
        .maybeSingle();

      if (existingWorkflow) {
        await supabase
          .from('client_workflows')
          .update({
            contact_frequency_days: averageDaysBetween,
            last_contact_date: lastPickup.pickup_date,
            next_contact_date: expectedNextPickup,
            status: isOverdue ? 'overdue' : 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingWorkflow.id);
      } else if (averageDaysBetween && expectedNextPickup) {
        // Get organization_id
        const { data: clientData } = await supabase
          .from('clients')
          .select('organization_id')
          .eq('id', client.id)
          .single();

        if (clientData) {
          await supabase
            .from('client_workflows')
            .insert({
              client_id: client.id,
              organization_id: clientData.organization_id,
              workflow_type: 'followup',
              contact_frequency_days: averageDaysBetween,
              last_contact_date: lastPickup.pickup_date,
              next_contact_date: expectedNextPickup,
              status: isOverdue ? 'overdue' : 'active',
            });
        }
      }
    }

    // Insert notifications in batch
    if (notifications.length > 0) {
      console.log(`Creating ${notifications.length} notifications for overdue clients...`);
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
      }
    }

    const overdueClients = patterns.filter(p => p.isOverdue);
    
    console.log(`Analysis complete:
      - Total clients analyzed: ${patterns.length}
      - Overdue clients: ${overdueClients.length}
      - Notifications created: ${notifications.length}
    `);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalClients: patterns.length,
          overdueClients: overdueClients.length,
          notificationsCreated: notifications.length,
        },
        patterns: patterns.filter(p => p.isOverdue), // Return only overdue clients
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in analyze-pickup-patterns:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
