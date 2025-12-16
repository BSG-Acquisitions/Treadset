import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ZipCluster {
  zip: string;
  count: number;
  dayOfWeek: number[];
  avgLat: number;
  avgLng: number;
}

interface SuggestedZone {
  zone_name: string;
  zip_codes: string[];
  primary_service_days: string[];
  center_lat: number;
  center_lng: number;
  pickup_count: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { organizationId } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organizationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing service zones for organization: ${organizationId}`);

    // Get completed manifests from last 90 days with client data
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: manifests, error: manifestError } = await supabase
      .from('manifests')
      .select(`
        id,
        signed_at,
        created_at,
        clients (
          id,
          physical_zip,
          zip,
          depot_lat,
          depot_lng
        )
      `)
      .eq('organization_id', organizationId)
      .in('status', ['COMPLETED', 'AWAITING_RECEIVER_SIGNATURE'])
      .gte('signed_at', ninetyDaysAgo.toISOString());

    if (manifestError) {
      console.error('Error fetching manifests:', manifestError);
      throw manifestError;
    }

    console.log(`Found ${manifests?.length || 0} manifests to analyze`);

    if (!manifests || manifests.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          suggestedZones: [],
          message: 'No manifest data available for zone analysis'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cluster by ZIP code and day of week
    const zipClusters: Map<string, ZipCluster> = new Map();

    for (const manifest of manifests) {
      const client = manifest.clients;
      const zip = client?.physical_zip || client?.zip;
      if (!zip) continue;

      const date = new Date(manifest.signed_at || manifest.created_at);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Use client depot coordinates
      const lat = client?.depot_lat || 0;
      const lng = client?.depot_lng || 0;

      if (!zipClusters.has(zip)) {
        zipClusters.set(zip, {
          zip,
          count: 0,
          dayOfWeek: [],
          avgLat: 0,
          avgLng: 0,
        });
      }

      const cluster = zipClusters.get(zip)!;
      cluster.count++;
      cluster.dayOfWeek.push(dayOfWeek);
      // Running average for lat/lng
      cluster.avgLat = ((cluster.avgLat * (cluster.count - 1)) + lat) / cluster.count;
      cluster.avgLng = ((cluster.avgLng * (cluster.count - 1)) + lng) / cluster.count;
    }

    // Group ZIPs by geographic proximity and common service days
    const suggestedZones: SuggestedZone[] = [];
    const processedZips = new Set<string>();

    // Sort clusters by count (most frequent first)
    const sortedClusters = Array.from(zipClusters.values())
      .sort((a, b) => b.count - a.count);

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    for (const cluster of sortedClusters) {
      if (processedZips.has(cluster.zip)) continue;

      // Find the most common days for this ZIP
      const dayCounts: Record<number, number> = {};
      for (const day of cluster.dayOfWeek) {
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }

      // Get top 2 most common days
      const topDays = Object.entries(dayCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2)
        .map(([day]) => parseInt(day));

      // Find nearby ZIPs (within ~10 miles based on lat/lng)
      const nearbyZips: string[] = [cluster.zip];
      processedZips.add(cluster.zip);

      for (const otherCluster of sortedClusters) {
        if (processedZips.has(otherCluster.zip)) continue;

        // Simple distance calculation (roughly accurate for small areas)
        const latDiff = Math.abs(cluster.avgLat - otherCluster.avgLat);
        const lngDiff = Math.abs(cluster.avgLng - otherCluster.avgLng);
        const approxMiles = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69; // ~69 miles per degree

        if (approxMiles < 10) {
          // Check if service days overlap
          const otherDayCounts: Record<number, number> = {};
          for (const day of otherCluster.dayOfWeek) {
            otherDayCounts[day] = (otherDayCounts[day] || 0) + 1;
          }
          const otherTopDays = Object.entries(otherDayCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 2)
            .map(([day]) => parseInt(day));

          const hasOverlap = topDays.some(d => otherTopDays.includes(d));
          if (hasOverlap) {
            nearbyZips.push(otherCluster.zip);
            processedZips.add(otherCluster.zip);
          }
        }
      }

      // Calculate zone center
      let totalLat = 0, totalLng = 0, totalCount = 0;
      for (const zip of nearbyZips) {
        const c = zipClusters.get(zip)!;
        totalLat += c.avgLat * c.count;
        totalLng += c.avgLng * c.count;
        totalCount += c.count;
      }

      // Generate zone name based on most frequent ZIP or location
      const zoneName = `Zone ${suggestedZones.length + 1} (${nearbyZips[0]} area)`;

      suggestedZones.push({
        zone_name: zoneName,
        zip_codes: nearbyZips,
        primary_service_days: topDays.map(d => dayNames[d]),
        center_lat: totalLat / totalCount,
        center_lng: totalLng / totalCount,
        pickup_count: totalCount,
      });

      // Limit to 10 zones
      if (suggestedZones.length >= 10) break;
    }

    console.log(`Generated ${suggestedZones.length} suggested zones`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        suggestedZones,
        analyzedManifests: manifests.length,
        uniqueZipCodes: zipClusters.size,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing service zones:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
