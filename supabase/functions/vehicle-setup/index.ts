import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Vehicle {
  name: string;
  capacity: number;
  license_plate?: string;
  is_active: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, vehicles } = await req.json();
    console.log('Vehicle setup request:', { action, vehicles });

    if (action === 'create_default_fleet') {
      // Create BSG fleet with real capacities and multi-trip capability  
      const defaultVehicles: Vehicle[] = [
        {
          name: "Brenner Whitt - Active Truck",
          capacity: 500, // Correct capacity - can do multiple trips
          license_plate: "BSG-001",
          is_active: true
        },
        {
          name: "Backup Active Truck",
          capacity: 350,
          license_plate: "BSG-002", 
          is_active: true
        }
      ];

      const { data, error } = await supabase
        .from('vehicles')
        .insert(defaultVehicles)
        .select();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          message: `Created ${defaultVehicles.length} vehicles successfully`,
          vehicles: data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'add_vehicles' && vehicles) {
      // Add custom vehicles
      const { data, error } = await supabase
        .from('vehicles')
        .insert(vehicles)
        .select();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          message: `Added ${vehicles.length} vehicles successfully`,
          vehicles: data
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'list_vehicles') {
      // List all vehicles
      const { data: allVehicles, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({
          vehicles: allVehicles || [],
          active_count: allVehicles?.filter(v => v.is_active).length || 0,
          total_count: allVehicles?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      throw new Error('Invalid action. Use "create_default_fleet", "add_vehicles", or "list_vehicles"');
    }

  } catch (error: any) {
    console.error('Vehicle setup error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});