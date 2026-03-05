import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MapboxGeocodeFeature {
  center: [number, number]; // [lng, lat]
  place_type: string[];
  relevance: number;
  context?: Array<{
    id: string;
    text: string;
  }>;
  properties?: {
    accuracy?: string;
  };
}

interface MapboxGeocodeResponse {
  type: string;
  features: MapboxGeocodeFeature[];
}

// Detroit Metro Area Boundaries (expanded to include downriver communities)
// Covers Wayne, Oakland, Macomb counties plus downriver (Monroe, Flat Rock, etc.)
const DETROIT_BOUNDS = {
  minLat: 41.9,  // Extended south to include Monroe, Flat Rock, Rockwood
  maxLat: 42.85, // Extended north slightly
  minLng: -84.0, // Extended west to include Ann Arbor area
  maxLng: -82.4
};

const DETROIT_METRO_COUNTIES = ['Wayne', 'Oakland', 'Macomb'];
// St. Clair County (includes Cottrellville) is NOT a valid service area - reject these results
const EXCLUDED_COUNTIES = ['St. Clair', 'St Clair', 'Saint Clair'];
const MAX_DISTANCE_FROM_DEPOT_KM = 160; // ~100 miles
const MAX_DISTANCE_FROM_ZIP_KM = 15; // ~9 miles - geocode must be within this distance of ZIP code center

// Known bad coordinates that have been incorrectly assigned in the past
const KNOWN_BAD_COORDINATES = [
  { lat: 42.71278770, lng: -82.58916040, reason: 'Cottrellville - outside service area' },
  { lat: 42.51445660, lng: -83.01465260, reason: 'Duplicate coordinate - needs re-geocoding' }
];

// Michigan ZIP code approximate centers for validation
// This helps catch geocoding errors where the result is in the wrong city
const MI_ZIP_CENTERS: Record<string, { lat: number; lng: number; city: string }> = {
  // Detroit Metro
  '48134': { lat: 42.0973, lng: -83.2918, city: 'Flat Rock' },
  '48093': { lat: 42.4987, lng: -82.9892, city: 'Warren' },
  '48215': { lat: 42.4006, lng: -82.9591, city: 'Detroit' },
  '48089': { lat: 42.4419, lng: -82.9339, city: 'Warren' },
  '48212': { lat: 42.4103, lng: -83.0574, city: 'Hamtramck' },
  '48205': { lat: 42.4317, lng: -82.9819, city: 'Detroit' },
  '48234': { lat: 42.4392, lng: -83.0217, city: 'Detroit' },
  '48091': { lat: 42.4675, lng: -82.9575, city: 'Warren' },
  '48092': { lat: 42.5203, lng: -82.9858, city: 'Warren' },
  '48088': { lat: 42.5194, lng: -82.9453, city: 'Warren' },
  '48030': { lat: 42.4625, lng: -83.1003, city: 'Hazel Park' },
  '48220': { lat: 42.4589, lng: -83.1406, city: 'Ferndale' },
  '48071': { lat: 42.4806, lng: -83.1456, city: 'Madison Heights' },
  '48073': { lat: 42.5089, lng: -83.1761, city: 'Royal Oak' },
  '48067': { lat: 42.4897, lng: -83.1419, city: 'Royal Oak' },
  '48237': { lat: 42.4653, lng: -83.1800, city: 'Oak Park' },
  '48075': { lat: 42.4642, lng: -83.2189, city: 'Southfield' },
  '48076': { lat: 42.4931, lng: -83.2194, city: 'Southfield' },
  '48034': { lat: 42.5200, lng: -83.2458, city: 'Southfield' },
  '48025': { lat: 42.5247, lng: -83.2897, city: 'Beverly Hills' },
  '48009': { lat: 42.5467, lng: -83.2114, city: 'Birmingham' },
  '48017': { lat: 42.5297, lng: -83.1558, city: 'Clawson' },
  '48083': { lat: 42.5494, lng: -83.1086, city: 'Troy' },
  '48084': { lat: 42.5608, lng: -83.1519, city: 'Troy' },
  '48085': { lat: 42.5869, lng: -83.1175, city: 'Troy' },
  '48098': { lat: 42.6000, lng: -83.1483, city: 'Troy' },
  '48310': { lat: 42.5392, lng: -83.0311, city: 'Sterling Heights' },
  '48312': { lat: 42.5639, lng: -83.0003, city: 'Sterling Heights' },
  '48313': { lat: 42.5894, lng: -82.9853, city: 'Sterling Heights' },
  '48314': { lat: 42.5772, lng: -83.0442, city: 'Sterling Heights' },
  '48315': { lat: 42.6117, lng: -82.9731, city: 'Utica' },
  '48316': { lat: 42.6367, lng: -83.0269, city: 'Utica' },
  '48317': { lat: 42.6269, lng: -82.9689, city: 'Utica' },
  '48322': { lat: 42.5439, lng: -83.3361, city: 'West Bloomfield' },
  '48323': { lat: 42.5647, lng: -83.3653, city: 'West Bloomfield' },
  '48324': { lat: 42.5806, lng: -83.3131, city: 'West Bloomfield' },
  '48331': { lat: 42.5047, lng: -83.3711, city: 'Farmington Hills' },
  '48334': { lat: 42.5200, lng: -83.3408, city: 'Farmington Hills' },
  '48335': { lat: 42.4592, lng: -83.3958, city: 'Farmington Hills' },
  '48336': { lat: 42.4714, lng: -83.3503, city: 'Farmington Hills' },
  '48127': { lat: 42.3222, lng: -83.2594, city: 'Dearborn Heights' },
  '48125': { lat: 42.3022, lng: -83.2403, city: 'Dearborn Heights' },
  '48126': { lat: 42.3242, lng: -83.1733, city: 'Dearborn' },
  '48124': { lat: 42.2936, lng: -83.2108, city: 'Dearborn' },
  '48128': { lat: 42.3219, lng: -83.2097, city: 'Dearborn' },
  '48146': { lat: 42.2706, lng: -83.1497, city: 'Lincoln Park' },
  '48229': { lat: 42.2694, lng: -83.1175, city: 'Ecorse' },
  '48192': { lat: 42.2044, lng: -83.1611, city: 'Wyandotte' },
  '48195': { lat: 42.2083, lng: -83.2353, city: 'Southgate' },
  '48180': { lat: 42.2317, lng: -83.2728, city: 'Taylor' },
  '48183': { lat: 42.1964, lng: -83.2336, city: 'Trenton' },
  '48173': { lat: 42.1458, lng: -83.2272, city: 'Rockwood' },
  '48138': { lat: 42.1208, lng: -83.1789, city: 'Grosse Ile' },
  '48162': { lat: 41.9558, lng: -83.3889, city: 'Monroe' },
  '48161': { lat: 41.9164, lng: -83.4019, city: 'Monroe' },
  '48150': { lat: 42.4178, lng: -83.3617, city: 'Livonia' },
  '48152': { lat: 42.4394, lng: -83.3742, city: 'Livonia' },
  '48154': { lat: 42.3972, lng: -83.3806, city: 'Livonia' },
  '48167': { lat: 42.4278, lng: -83.4811, city: 'Northville' },
  '48170': { lat: 42.3703, lng: -83.4689, city: 'Plymouth' },
  '48188': { lat: 42.2403, lng: -83.4803, city: 'Canton' },
  '48187': { lat: 42.3081, lng: -83.4608, city: 'Canton' },
  '48185': { lat: 42.3217, lng: -83.3639, city: 'Westland' },
  '48186': { lat: 42.2936, lng: -83.3569, city: 'Westland' },
  '48135': { lat: 42.3169, lng: -83.2958, city: 'Garden City' },
  '48228': { lat: 42.3536, lng: -83.2483, city: 'Detroit' },
  '48239': { lat: 42.3922, lng: -83.2756, city: 'Redford' },
  '48240': { lat: 42.4153, lng: -83.3014, city: 'Redford' },
  '48219': { lat: 42.4397, lng: -83.2619, city: 'Detroit' },
  '48223': { lat: 42.3878, lng: -83.2456, city: 'Detroit' },
  '48227': { lat: 42.3892, lng: -83.1892, city: 'Detroit' },
  '48235': { lat: 42.4269, lng: -83.1894, city: 'Detroit' },
  '48221': { lat: 42.4269, lng: -83.1497, city: 'Detroit' },
  '48203': { lat: 42.4183, lng: -83.1094, city: 'Highland Park' },
  '48202': { lat: 42.3744, lng: -83.0758, city: 'Detroit' },
  '48201': { lat: 42.3456, lng: -83.0644, city: 'Detroit' },
  '48226': { lat: 42.3317, lng: -83.0453, city: 'Detroit' },
  '48207': { lat: 42.3500, lng: -83.0214, city: 'Detroit' },
  '48214': { lat: 42.3728, lng: -82.9892, city: 'Detroit' },
  '48224': { lat: 42.4100, lng: -82.9508, city: 'Detroit' },
  '48225': { lat: 42.4306, lng: -82.9153, city: 'Harper Woods' },
  '48236': { lat: 42.4358, lng: -82.8994, city: 'Grosse Pointe' },
  '48021': { lat: 42.4694, lng: -82.9483, city: 'Eastpointe' },
  '48066': { lat: 42.4936, lng: -82.9131, city: 'Roseville' },
  '48081': { lat: 42.4978, lng: -82.8792, city: 'St Clair Shores' },
  '48080': { lat: 42.4728, lng: -82.8853, city: 'St Clair Shores' },
  '48082': { lat: 42.5236, lng: -82.8814, city: 'St Clair Shores' },
  '48038': { lat: 42.5433, lng: -82.9183, city: 'Clinton Township' },
  '48035': { lat: 42.5581, lng: -82.8933, city: 'Clinton Township' },
  '48036': { lat: 42.5811, lng: -82.9175, city: 'Clinton Township' },
  '48042': { lat: 42.6083, lng: -82.9242, city: 'Macomb' },
  '48044': { lat: 42.6472, lng: -82.9278, city: 'Macomb' },
  '48047': { lat: 42.6256, lng: -82.8283, city: 'New Baltimore' },
  '48050': { lat: 42.6717, lng: -82.7628, city: 'New Haven' },
  '48051': { lat: 42.6639, lng: -82.8631, city: 'New Baltimore' },
  // Lansing Area (expanded coverage)
  '48842': { lat: 42.6475, lng: -84.5167, city: 'Holt' },
  '48906': { lat: 42.7558, lng: -84.5553, city: 'Lansing' },
  '48910': { lat: 42.7003, lng: -84.5514, city: 'Lansing' },
  '48911': { lat: 42.6728, lng: -84.5872, city: 'Lansing' },
  '48912': { lat: 42.7336, lng: -84.5167, city: 'Lansing' },
  '48933': { lat: 42.7336, lng: -84.5553, city: 'Lansing' },
  '48915': { lat: 42.7475, lng: -84.5803, city: 'Lansing' },
  '48917': { lat: 42.7253, lng: -84.6336, city: 'Lansing' },
  '48864': { lat: 42.7003, lng: -84.4697, city: 'Okemos' },
  '48823': { lat: 42.7253, lng: -84.4697, city: 'East Lansing' },
  '48824': { lat: 42.7336, lng: -84.4836, city: 'East Lansing' },
  '48840': { lat: 42.7558, lng: -84.3836, city: 'Haslett' },
  '48854': { lat: 42.5894, lng: -84.4003, city: 'Mason' },
  '48837': { lat: 42.7764, lng: -84.7439, city: 'Grand Ledge' },
  '48820': { lat: 42.8419, lng: -84.5553, city: 'DeWitt' },
  '48808': { lat: 42.8253, lng: -84.4697, city: 'Bath' },
  // Ann Arbor Area
  '48103': { lat: 42.2808, lng: -83.7631, city: 'Ann Arbor' },
  '48104': { lat: 42.2731, lng: -83.7303, city: 'Ann Arbor' },
  '48105': { lat: 42.3042, lng: -83.7053, city: 'Ann Arbor' },
  '48108': { lat: 42.2369, lng: -83.7233, city: 'Ann Arbor' },
  '48109': { lat: 42.2808, lng: -83.7386, city: 'Ann Arbor' },
  '48197': { lat: 42.2419, lng: -83.6236, city: 'Ypsilanti' },
  '48198': { lat: 42.2453, lng: -83.6128, city: 'Ypsilanti' },
  // Flint Area
  '48503': { lat: 43.0125, lng: -83.6875, city: 'Flint' },
  '48504': { lat: 43.0453, lng: -83.7053, city: 'Flint' },
  '48505': { lat: 43.0617, lng: -83.6564, city: 'Flint' },
  '48506': { lat: 43.0286, lng: -83.6403, city: 'Flint' },
  '48507': { lat: 42.9789, lng: -83.6789, city: 'Flint' },
  '48509': { lat: 43.0125, lng: -83.5928, city: 'Burton' },
  '48519': { lat: 42.9958, lng: -83.5928, city: 'Burton' },
  '48529': { lat: 42.9619, lng: -83.6236, city: 'Burton' },
  // Jackson Area
  '49201': { lat: 42.2458, lng: -84.4014, city: 'Jackson' },
  '49202': { lat: 42.2792, lng: -84.3708, city: 'Jackson' },
  '49203': { lat: 42.2292, lng: -84.4236, city: 'Jackson' },
};

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371; // km
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function guessState(address: string): string | null {
  // Try to pick up a two-letter state before ZIP
  const m = address.match(/,\s*([A-Z]{2})\s*\d{5}/i);
  if (m) return m[1].toUpperCase();
  if (/\bMI\b/i.test(address)) return 'MI';
  return null;
}

function isOutOfStateAddress(address: string, clientState?: string): boolean {
  // Check if the address or client state indicates a non-Michigan location
  const state = guessState(address) || clientState?.toUpperCase();
  if (!state) return false;
  return state !== 'MI' && state !== 'MICHIGAN';
}

function isWithinDetroitMetro(lat: number, lng: number): boolean {
  return lat >= DETROIT_BOUNDS.minLat &&
         lat <= DETROIT_BOUNDS.maxLat &&
         lng >= DETROIT_BOUNDS.minLng &&
         lng <= DETROIT_BOUNDS.maxLng;
}

function extractCounty(feature: MapboxGeocodeFeature): string | null {
  if (!feature.context) return null;
  // Mapbox uses 'district' for US counties
  const countyContext = feature.context.find(ctx => 
    ctx.id.startsWith('district.') || ctx.id.startsWith('region.')
  );
  if (countyContext) {
    return countyContext.text.replace(' County', '');
  }
  return null;
}

function isExcludedCounty(county: string | null): boolean {
  if (!county) return false;
  return EXCLUDED_COUNTIES.some(excluded => 
    county.toLowerCase().includes(excluded.toLowerCase())
  );
}

function isKnownBadCoordinate(lat: number, lng: number): boolean {
  return KNOWN_BAD_COORDINATES.some(bad => 
    Math.abs(bad.lat - lat) < 0.0001 && Math.abs(bad.lng - lng) < 0.0001
  );
}

// Extract ZIP code from address string
function extractZipCode(address: string): string | null {
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : null;
}

// Validate geocoded coordinates against expected ZIP code center
function validateAgainstZipCode(
  lat: number, 
  lng: number, 
  address: string
): { valid: boolean; message?: string; expectedCity?: string } {
  const zip = extractZipCode(address);
  if (!zip || !MI_ZIP_CENTERS[zip]) {
    // No ZIP code validation possible - allow but log
    return { valid: true };
  }
  
  const expected = MI_ZIP_CENTERS[zip];
  const distanceKm = haversineDistance({ lat, lng }, { lat: expected.lat, lng: expected.lng });
  
  if (distanceKm > MAX_DISTANCE_FROM_ZIP_KM) {
    return { 
      valid: false, 
      message: `Geocoded coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}) are ${distanceKm.toFixed(1)}km from expected ${expected.city} (ZIP ${zip}) center - likely wrong city`,
      expectedCity: expected.city
    };
  }
  
  return { valid: true, expectedCity: expected.city };
}

function enhanceAddress(address: string, clientCity?: string, clientState?: string): string {
  // If address already has city and state, return as-is
  if (/,\s*[A-Z]{2}\s*\d{5}/.test(address)) {
    return address;
  }
  
  // Add city and state if available from client
  if (clientCity && clientState) {
    return `${address}, ${clientCity}, ${clientState}`;
  }
  
  // Default to Detroit, MI if no other info available
  if (!/Detroit|MI/i.test(address)) {
    return `${address}, Detroit, MI`;
  }
  
  return address;
}

async function getOrgDepot(supabase: any, orgId: string): Promise<{ lat: number; lng: number }> {
  const { data: org, error } = await supabase
    .from('organizations')
    .select('depot_lat, depot_lng')
    .eq('id', orgId)
    .maybeSingle();
  if (error) {
    console.log('Failed to fetch org depot, using Detroit default:', error.message);
  }
  const lat = Number(org?.depot_lat ?? 42.3314);
  const lng = Number(org?.depot_lng ?? -83.0458);
  return { lat, lng };
}

function boundsFromCenter(center: { lat: number; lng: number }, radiusKm: number) {
  const latDelta = radiusKm / 111; // ~111km per degree lat
  const lngDelta = radiusKm / (111 * Math.cos(toRadians(center.lat)) || 1);
  const sw = { lat: center.lat - latDelta, lng: center.lng - lngDelta };
  const ne = { lat: center.lat + latDelta, lng: center.lng + lngDelta };
  return `${sw.lat},${sw.lng}|${ne.lat},${ne.lng}`;
}

async function geocodeAddress(
  address: string,
  mapboxToken: string,
  opts?: { proximity?: string; bbox?: string; country?: string }
): Promise<{ lat: number; lng: number; county?: string; confidence: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address.trim());
    const params = new URLSearchParams({ 
      access_token: mapboxToken,
      limit: '5', // Get top 5 results to find best match
      types: 'address,poi', // Only precise address or point of interest
      autocomplete: 'false' // Disable autocomplete for more precise results
    });
    
    if (opts?.country) params.set('country', opts.country);
    if (opts?.proximity) params.set('proximity', opts.proximity);
    if (opts?.bbox) params.set('bbox', opts.bbox);
    
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?${params.toString()}`;

    console.log(`🔍 Geocoding: "${address}"`);
    const response = await fetch(url);
    const data: MapboxGeocodeResponse = await response.json();

    if (data.features && data.features.length > 0) {
      // Find the most precise result within Detroit metro
      let bestFeature: MapboxGeocodeFeature | null = null;
      let bestScore = 0;

      for (const feature of data.features) {
        const [lng, lat] = feature.center;
        const placeTypes = feature.place_type || [];
        const relevance = feature.relevance || 0;
        
        // Skip if not precise enough
        const allowedTypes = ['address', 'poi'];
        const isPrecise = placeTypes.some((t) => allowedTypes.includes(t));
        if (!isPrecise) continue;
        
        // Check if within Detroit metro bounds
        const inDetroitBounds = isWithinDetroitMetro(lat, lng);
        if (!inDetroitBounds) continue;
        
        // CRITICAL: Reject results from excluded counties (e.g., St. Clair/Cottrellville)
        const county = extractCounty(feature);
        if (isExcludedCounty(county)) {
          console.log(`⚠️ Rejected result in excluded county: ${county}`);
          continue;
        }
        
        // CRITICAL: Reject known bad coordinates
        if (isKnownBadCoordinate(lat, lng)) {
          console.log(`⚠️ Rejected known bad coordinate: (${lat}, ${lng})`);
          continue;
        }
        
        // CRITICAL: Validate against ZIP code center to catch wrong-city errors
        const zipValidation = validateAgainstZipCode(lat, lng, address);
        if (!zipValidation.valid) {
          console.log(`⚠️ ZIP validation failed: ${zipValidation.message}`);
          continue;
        }
        
        // Calculate score based on relevance and precision
        let score = relevance * 100;
        if (placeTypes.includes('address')) score += 50; // Prefer addresses over POIs
        
        if (score > bestScore) {
          bestScore = score;
          bestFeature = feature;
        }
      }

      if (!bestFeature) {
        console.log(`❌ No precise Detroit metro results for: ${address}`);
        return null;
      }

      const [lng, lat] = bestFeature.center;
      const placeTypes = bestFeature.place_type || [];
      const relevance = bestFeature.relevance || 0;
      
      // Extract county for validation
      const county = extractCounty(bestFeature);
      
      // Validate against Detroit metro area bounds
      const inDetroitBounds = isWithinDetroitMetro(lat, lng);
      const inDetroitCounty = county ? DETROIT_METRO_COUNTIES.includes(county) : false;
      
      // Calculate confidence score
      let confidence = Math.round(relevance * 50); // Base score from relevance
      if (placeTypes.includes('address')) confidence += 30; // Address is better than POI
      if (inDetroitBounds) confidence += 10;
      if (inDetroitCounty) confidence += 10;
      
      // Log validation results
      console.log(`📍 Geocoded: ${address} -> (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
      console.log(`   Type: ${placeTypes.join(',')}, County: ${county || 'unknown'}, Confidence: ${confidence}%, Relevance: ${relevance.toFixed(2)}`);
      
      return { 
        lat, 
        lng,
        county,
        confidence
      };
    }

    console.log(`❌ No results for: ${address}`);
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

// Unbounded geocoding for out-of-state addresses — no Detroit metro filtering
async function geocodeAddressUnbounded(
  address: string,
  mapboxToken: string
): Promise<{ lat: number; lng: number; confidence: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address.trim());
    const params = new URLSearchParams({
      access_token: mapboxToken,
      limit: '3',
      types: 'address,poi',
      autocomplete: 'false',
      country: 'us',
    });

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?${params.toString()}`;
    console.log(`🌍 Unbounded geocoding: "${address}"`);
    const response = await fetch(url);
    const data: MapboxGeocodeResponse = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [lng, lat] = feature.center;
      const relevance = feature.relevance || 0;
      const placeTypes = feature.place_type || [];
      let confidence = Math.round(relevance * 50);
      if (placeTypes.includes('address')) confidence += 30;
      
      console.log(`📍 Unbounded result: (${lat.toFixed(6)}, ${lng.toFixed(6)}) confidence=${confidence}%`);
      return { lat, lng, confidence };
    }

    console.log(`❌ No unbounded results for: ${address}`);
    return null;
  } catch (error) {
    console.error('Error in unbounded geocoding:', error);
    return null;
  }
}


  Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    if (!mapboxToken) {
      throw new Error('Mapbox access token not configured');
    }

    const { locationId, address, forceUpdate = false, fixOutliers = false } = await req.json();
    console.log('Geocoding request:', { locationId, address, forceUpdate, fixOutliers });

    if (locationId) {
      // Geocode a specific location
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select(`
          id, name, address, latitude, longitude, organization_id,
          client_id,
          clients!inner(city, state)
        `)
        .eq('id', locationId)
        .single();

      if (locationError) throw locationError;

      // Skip if already has coordinates and not forcing update
      if (!forceUpdate && location.latitude && location.longitude) {
        const depot = await getOrgDepot(supabase, location.organization_id);
        const distanceKm = haversineDistance(depot, { lat: Number(location.latitude), lng: Number(location.longitude) });
        const isOutlier = distanceKm > MAX_DISTANCE_FROM_DEPOT_KM;
        
        if (!isOutlier) {
          return new Response(
            JSON.stringify({ 
              message: 'Location already has good coordinates',
              location: {
                id: location.id,
                name: location.name,
                latitude: location.latitude,
                longitude: location.longitude,
                distanceFromDepotMiles: (distanceKm * 0.621371).toFixed(1)
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const addressToGeocode = address || location.address;
      if (!addressToGeocode) {
        throw new Error('No address available for geocoding');
      }

      // Get client city/state if available
      const clientCity = (location as any).clients?.city;
      const clientState = (location as any).clients?.state || 'MI';

      // Detect out-of-state addresses — skip Detroit-specific bounds and enhancement
      const outOfState = isOutOfStateAddress(addressToGeocode, clientState);
      
      if (outOfState) {
        console.log(`🌍 Out-of-state address detected (state: ${guessState(addressToGeocode) || clientState}), skipping Detroit bounds`);
        
        // Geocode without Detroit-specific bbox/proximity/enhancement
        let coordinates = await geocodeAddressUnbounded(`${location.name}, ${addressToGeocode}`, mapboxToken);
        if (!coordinates) {
          coordinates = await geocodeAddressUnbounded(addressToGeocode, mapboxToken);
        }
        if (!coordinates) {
          throw new Error(`Failed to geocode out-of-state address: ${addressToGeocode}`);
        }
        
        // Update the location
        const { error: updateError } = await supabase
          .from('locations')
          .update({
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            geocode_confidence: coordinates.confidence,
            geocoded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', locationId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({
            message: `Out-of-state location geocoded successfully`,
            location: { id: location.id, name: location.name, latitude: coordinates.lat, longitude: coordinates.lng, confidence: coordinates.confidence }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Michigan address — use Detroit-specific enhancement and bounds
      const enhancedAddress = enhanceAddress(addressToGeocode, clientCity, clientState);
      console.log(`🔍 Original: "${addressToGeocode}" -> Enhanced: "${enhancedAddress}"`);

      const depot = await getOrgDepot(supabase, location.organization_id);
      const proximity = `${depot.lng},${depot.lat}`; // Mapbox uses lng,lat
      const bbox = `${depot.lng - 1.5},${depot.lat - 1},${depot.lng + 1},${depot.lat + 1}`; // ~100 mile radius
      
      // Try 1: Full address with business name for best precision
      let coordinates = await geocodeAddress(`${location.name}, ${enhancedAddress}`, mapboxToken, { 
        country: 'us',
        proximity,
        bbox
      });
      
      // Try 2: Just the enhanced address
      if (!coordinates) {
        console.log('⚠️  Trying without business name...');
        coordinates = await geocodeAddress(enhancedAddress, mapboxToken, {
          country: 'us',
          proximity,
          bbox
        });
      }
      
      // Try 3: Original address
      if (!coordinates) {
        console.log('⚠️  Trying original address...');
        coordinates = await geocodeAddress(addressToGeocode, mapboxToken, {
          country: 'us',
          proximity,
          bbox
        });
      }
      
      // Try 4: Business name with city (last resort)
      if (!coordinates && location?.name) {
        console.log('⚠️  Last resort: business name with Detroit, MI...');
        coordinates = await geocodeAddress(`${location.name}, Detroit, MI`, mapboxToken, { 
          country: 'us',
          proximity,
          bbox
        });
      }
      
      if (!coordinates) {
        throw new Error(`Failed to geocode address: ${enhancedAddress}. All attempts exhausted.`);
      }

      // Final validation - reject if way outside Detroit area
      const distanceFromDepot = haversineDistance(depot, coordinates);
      if (distanceFromDepot > MAX_DISTANCE_FROM_DEPOT_KM) {
        console.log(`⚠️  WARNING: Geocoded location is ${distanceFromDepot.toFixed(0)}km from depot (>${MAX_DISTANCE_FROM_DEPOT_KM}km threshold)`);
        throw new Error(
          `Geocoded coordinates are too far from depot (${(distanceFromDepot * 0.621371).toFixed(0)} miles). ` +
          `This likely indicates an incorrect geocode result. Please verify the address.`
        );
      }

      // Update the location with coordinates
      const { error: updateError } = await supabase
        .from('locations')
        .update({
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', locationId);

      if (updateError) throw updateError;

      const distanceMiles = (distanceFromDepot * 0.621371).toFixed(1);
      const confidenceMsg = coordinates.confidence >= 80 ? '✅ High confidence' : 
                           coordinates.confidence >= 60 ? '⚠️  Medium confidence' : 
                           '❌ Low confidence - manual review recommended';

      return new Response(
        JSON.stringify({
          message: 'Location coordinates updated successfully',
          location: {
            id: location.id,
            name: location.name,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            county: coordinates.county,
            confidence: coordinates.confidence,
            distanceFromDepotMiles: distanceMiles,
            confidenceLevel: confidenceMsg
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Geocode all locations - batch mode
      console.log('🔄 Starting batch geocoding...');
      const { data: allLocations, error: locationsError } = await supabase
        .from('locations')
        .select(`
          id, name, address, latitude, longitude, organization_id,
          client_id,
          clients!inner(city, state)
        `);

      if (locationsError) throw locationsError;

      if (!allLocations || allLocations.length === 0) {
        return new Response(
          JSON.stringify({ 
            message: 'No locations found',
            processed: 0 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📊 Found ${allLocations.length} locations to process`);

      const results = [];
      let successful = 0;
      let failed = 0;
      let skipped = 0;
      let outliersCorrected = 0;
      let lowConfidence = 0;

      for (const location of allLocations) {
        if (!location.address) {
          console.log(`⏭️  Skipping location ${location.id} - no address`);
          failed++;
          continue;
        }

        const hasCoords = location.latitude && location.longitude;
        const depot = await getOrgDepot(supabase, location.organization_id);
        const proximity = `${depot.lng},${depot.lat}`;
        const bbox = `${depot.lng - 1.5},${depot.lat - 1},${depot.lng + 1},${depot.lat + 1}`;
        const isOutlier = hasCoords && haversineDistance(depot, { lat: Number(location.latitude), lng: Number(location.longitude) }) > MAX_DISTANCE_FROM_DEPOT_KM;
        
        // Only process if: no coords, is outlier+fixing, or force update
        const shouldProcess = (!hasCoords) || (fixOutliers && isOutlier) || (forceUpdate === true);
        if (!shouldProcess) {
          skipped++;
          continue;
        }

        // Get client location info
        const clientCity = (location as any).clients?.city;
        const clientState = (location as any).clients?.state || 'MI';

        // Enhance address before geocoding
        const enhancedAddress = enhanceAddress(location.address, clientCity, clientState);
        if (enhancedAddress !== location.address) {
          console.log(`🔍 Enhanced: "${location.address}" -> "${enhancedAddress}"`);
        }

        // Try geocoding with business name + enhanced address for better precision
        let coordinates = await geocodeAddress(`${location.name}, ${enhancedAddress}`, mapboxToken, { 
          country: 'us',
          proximity,
          bbox
        });
        
        // Fallback: enhanced address only
        if (!coordinates) {
          console.log(`⚠️  Trying enhanced address without business name...`);
          coordinates = await geocodeAddress(enhancedAddress, mapboxToken, {
            country: 'us',
            proximity,
            bbox
          });
        }
        
        // Fallback: original address
        if (!coordinates) {
          console.log(`⚠️  Trying original address...`);
          coordinates = await geocodeAddress(location.address, mapboxToken, {
            country: 'us',
            proximity,
            bbox
          });
        }
        
        // Last resort: business name with city
        if (!coordinates && location?.name) {
          console.log(`⚠️  Last resort: business name with Detroit, MI`);
          coordinates = await geocodeAddress(`${location.name}, Detroit, MI`, mapboxToken, { 
            country: 'us',
            proximity,
            bbox
          });
        }
        
        if (!coordinates) {
          console.log(`❌ Failed to geocode location ${location.id}: ${location.address}`);
          failed++;
          continue;
        }

        // Final distance validation - reject if too far from depot
        const distanceFromDepot = haversineDistance(depot, coordinates);
        if (distanceFromDepot > MAX_DISTANCE_FROM_DEPOT_KM) {
          console.log(`❌ Rejected geocode for ${location.id}: ${distanceFromDepot.toFixed(0)}km from depot (max: ${MAX_DISTANCE_FROM_DEPOT_KM}km)`);
          failed++;
          continue;
        }

        // Track outlier corrections
        if (isOutlier && hasCoords) {
          outliersCorrected++;
          console.log(`✅ Corrected outlier ${location.id}: was ${haversineDistance(depot, { lat: Number(location.latitude), lng: Number(location.longitude) }).toFixed(0)}km, now ${distanceFromDepot.toFixed(0)}km from depot`);
        }

        // Track low confidence results
        if (coordinates.confidence < 70) {
          lowConfidence++;
          console.log(`⚠️  Low confidence (${coordinates.confidence}%) for ${location.id}`);
        }

        // Update database
        const { error: updateError } = await supabase
          .from('locations')
          .update({
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            updated_at: new Date().toISOString()
          })
          .eq('id', location.id);

        if (updateError) {
          console.error(`Failed to update location ${location.id}:`, updateError);
          failed++;
        } else {
          results.push({
            id: location.id,
            name: location.name,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            county: coordinates.county,
            confidence: coordinates.confidence,
            distanceFromDepotMiles: (distanceFromDepot * 0.621371).toFixed(1)
          });
          successful++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Batch complete: ${successful} successful, ${failed} failed, ${skipped} skipped, ${outliersCorrected} outliers corrected, ${lowConfidence} low confidence`);

      return new Response(
        JSON.stringify({
          message: `Geocoding completed: ${successful} successful, ${failed} failed, ${skipped} skipped`,
          processed: successful + failed,
          successful,
          failed,
          skipped,
          outliersCorrected,
          lowConfidence,
          locations: results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Geocoding error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});