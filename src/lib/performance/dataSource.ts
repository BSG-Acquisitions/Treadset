/**
 * Performance Optimized Data Source
 * PR#8: Fix N+1 queries and optimize payload sizes
 */

import { supabase } from '@/integrations/supabase/client';

export interface ClientSummary {
  id: string;
  company_name: string;
  is_active: boolean;
  lifetime_revenue: number;
  last_pickup_date?: string;
  pickup_count: number;
  outstanding_manifests: number;
  type: string;
}

export interface PickupWithClient {
  id: string;
  client_id: string;
  pickup_date: string;
  status: string;
  pte_count: number;
  computed_revenue: number;
  client: {
    company_name: string;
  };
  location?: {
    address: string;
  };
}

/**
 * Get dashboard data with single aggregated query (fixes N+1)
 */
export async function getDashboardData(organizationId: string): Promise<{
  clientSummaries: ClientSummary[];
  todayPickups: PickupWithClient[];
  stats: {
    totalRevenue: number;
    activeClients: number;
    completedPickups: number;
    overduePickups: number;
  };
}> {
  const startTime = Date.now();
  const today = new Date().toISOString().split('T')[0];

  try {
    // Single aggregated query for client summaries
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select(`
        id,
        company_name,
        is_active,
        lifetime_revenue,
        last_pickup_at,
        type,
        pickups:pickups(count),
        manifests:manifests!client_id(
          count,
          status
        )
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (clientError) throw clientError;

    // Single query for today's pickups with joins
    const { data: pickupData, error: pickupError } = await supabase
      .from('pickups')
      .select(`
        id,
        client_id,
        pickup_date,
        status,
        pte_count,
        computed_revenue,
        client:clients!client_id(company_name),
        location:locations(address)
      `)
      .eq('organization_id', organizationId)
      .eq('pickup_date', today)
      .order('pickup_date', { ascending: false });

    if (pickupError) throw pickupError;

    // Transform client data
    const clientSummaries: ClientSummary[] = (clientData || []).map(client => ({
      id: client.id,
      company_name: client.company_name,
      is_active: client.is_active,
      lifetime_revenue: client.lifetime_revenue || 0,
      last_pickup_date: client.last_pickup_at,
      pickup_count: Array.isArray(client.pickups) ? client.pickups[0]?.count || 0 : 0,
      outstanding_manifests: Array.isArray(client.manifests) 
        ? client.manifests.filter((m: any) => m.status !== 'COMPLETED').length 
        : 0,
      type: client.type || 'commercial'
    }));

    // Calculate aggregated stats
    const stats = {
      totalRevenue: clientSummaries.reduce((sum, c) => sum + c.lifetime_revenue, 0),
      activeClients: clientSummaries.length,
      completedPickups: (pickupData || []).filter(p => p.status === 'completed').length,
      overduePickups: (pickupData || []).filter(p => p.status === 'overdue').length
    };

    const elapsedMs = Date.now() - startTime;
    console.log(`[PERFORMANCE] Dashboard data loaded in ${elapsedMs}ms`, {
      clientCount: clientSummaries.length,
      pickupCount: (pickupData || []).length,
      queryOptimized: true
    });

    return {
      clientSummaries,
      todayPickups: pickupData || [],
      stats
    };

  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error(`[PERFORMANCE] Dashboard data failed after ${elapsedMs}ms`, error);
    throw error;
  }
}

/**
 * Get minimal client data for dropdowns/lists
 */
export async function getClientOptions(organizationId: string): Promise<Array<{
  id: string;
  company_name: string;
  is_active: boolean;
}>> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, company_name, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('company_name');

  if (error) throw error;
  return data || [];
}

/**
 * Get minimal pickup data for route planning
 */
export async function getRoutePickups(
  organizationId: string,
  date: string,
  driverId?: string
): Promise<Array<{
  id: string;
  client_id: string;
  location_id?: string;
  status: string;
  pte_count: number;
  client: { company_name: string };
  location?: { address: string; latitude?: number; longitude?: number };
}>> {
  let query = supabase
    .from('pickups')
    .select(`
      id,
      client_id,
      location_id,
      status,
      pte_count,
      client:clients!client_id(company_name),
      location:locations(address, latitude, longitude)
    `)
    .eq('organization_id', organizationId)
    .eq('pickup_date', date);

  if (driverId) {
    // Join with assignments to filter by driver
    query = supabase
      .from('pickups')
      .select(`
        id,
        client_id,
        location_id,
        status,
        pte_count,
        client:clients!client_id(company_name),
        location:locations(address, latitude, longitude),
        assignments:assignments!pickup_id(driver_id)
      `)
      .eq('organization_id', organizationId)
      .eq('pickup_date', date)
      .eq('assignments.driver_id', driverId);
  }

  const { data, error } = await query.order('status');
  
  if (error) throw error;
  return data || [];
}

/**
 * Get manifest data with minimal joins for PDF generation
 */
export async function getManifestData(manifestId: string): Promise<{
  manifest: any;
  client: { company_name: string; mailing_address?: string; city?: string; state?: string; zip?: string };
  location?: { name?: string; address: string };
  hauler?: { hauler_name: string; hauler_mailing_address?: string; hauler_city?: string };
}> {
  const { data, error } = await supabase
    .from('manifests')
    .select(`
      *,
      client:clients!client_id(
        company_name,
        mailing_address,
        city,
        state,
        zip
      ),
      location:locations(
        name,
        address
      ),
      hauler:haulers(
        hauler_name,
        hauler_mailing_address,
        hauler_city
      )
    `)
    .eq('id', manifestId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Manifest not found');

  return {
    manifest: data,
    client: data.client || { company_name: 'Unknown Client' },
    location: data.location,
    hauler: data.hauler
  };
}