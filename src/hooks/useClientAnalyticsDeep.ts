import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, subWeeks, subMonths, subQuarters, subYears, format, differenceInDays } from "date-fns";

export type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year';

export interface ClientSegment {
  client_id: string;
  company_name: string;
  current_revenue: number;
  previous_revenue: number;
  current_pickups: number;
  previous_pickups: number;
  change_percent: number;
  last_pickup_date: string | null;
  days_since_pickup: number;
  expected_frequency_days: number | null;
}

export interface RevenueByDay {
  day: string;
  dayName: string;
  revenue: number;
  pickups: number;
}

export interface RevenueTrend {
  date: string;
  revenue: number;
  pickups: number;
}

export interface ConcentrationData {
  top3Percent: number;
  top5Percent: number;
  top10Percent: number;
  topClients: { name: string; revenue: number; percent: number }[];
}

export interface ActionableInsight {
  type: 'warning' | 'success' | 'info' | 'alert';
  title: string;
  description: string;
  action?: string;
  clientId?: string;
}

export interface DeepAnalytics {
  // Period totals
  totalRevenue: number;
  totalPickups: number;
  totalTires: number;
  activeClients: number;
  
  // Revenue breakdown by source
  pickupRevenue: number;
  dropoffRevenue: number;
  
  // Comparisons
  previousRevenue: number;
  previousPickups: number;
  revenueChange: number;
  pickupsChange: number;
  
  // Client segments
  growingClients: ClientSegment[];
  stableClients: ClientSegment[];
  decliningClients: ClientSegment[];
  newClients: ClientSegment[];
  atRiskClients: ClientSegment[];
  
  // Revenue intelligence
  revenueByDay: RevenueByDay[];
  revenueTrend: RevenueTrend[];
  concentration: ConcentrationData;
  
  // Insights
  insights: ActionableInsight[];
}

const getPeriodDates = (period: AnalyticsPeriod) => {
  const now = new Date();
  let currentStart: Date;
  let previousStart: Date;
  let previousEnd: Date;
  
  switch (period) {
    case 'week':
      currentStart = startOfWeek(now, { weekStartsOn: 1 });
      previousStart = subWeeks(currentStart, 1);
      previousEnd = currentStart;
      break;
    case 'month':
      currentStart = startOfMonth(now);
      previousStart = subMonths(currentStart, 1);
      previousEnd = currentStart;
      break;
    case 'quarter':
      currentStart = startOfQuarter(now);
      previousStart = subQuarters(currentStart, 1);
      previousEnd = currentStart;
      break;
    case 'year':
      currentStart = startOfYear(now);
      previousStart = subYears(currentStart, 1);
      previousEnd = currentStart;
      break;
  }
  
  return {
    currentStart: format(currentStart, 'yyyy-MM-dd'),
    currentEnd: format(now, 'yyyy-MM-dd'),
    previousStart: format(previousStart, 'yyyy-MM-dd'),
    previousEnd: format(previousEnd, 'yyyy-MM-dd'),
  };
};

export const useClientAnalyticsDeep = (period: AnalyticsPeriod = 'month') => {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['client-analytics-deep', organizationId, period],
    queryFn: async (): Promise<DeepAnalytics> => {
      if (!organizationId) throw new Error('No organization found');

      const dates = getPeriodDates(period);
      const now = new Date();

      // Minimum date filter for real data (Nov 2025+)
      const MIN_DATA_DATE = '2025-11-01';
      const effectiveCurrentStart = dates.currentStart >= MIN_DATA_DATE ? dates.currentStart : MIN_DATA_DATE;
      const effectivePreviousStart = dates.previousStart >= MIN_DATA_DATE ? dates.previousStart : MIN_DATA_DATE;

      // Fetch current period PICKUPS directly (for revenue - more reliable than manifests.total)
      const { data: currentPickups, error: pickupsError } = await supabase
        .from('pickups')
        .select(`
          id,
          client_id,
          pickup_date,
          computed_revenue,
          final_revenue,
          status,
          clients!inner(id, company_name)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .gte('pickup_date', effectiveCurrentStart)
        .lte('pickup_date', dates.currentEnd);

      if (pickupsError) throw pickupsError;

      // Fetch current period manifests (for tire counts - include AWAITING_RECEIVER_SIGNATURE like dashboard)
      const { data: currentManifests, error: currentError } = await supabase
        .from('manifests')
        .select(`
          id,
          client_id,
          created_at,
          signed_at,
          pte_on_rim,
          pte_off_rim,
          commercial_17_5_19_5_off,
          commercial_17_5_19_5_on,
          commercial_22_5_off,
          commercial_22_5_on,
          otr_count,
          tractor_count
        `)
        .eq('organization_id', organizationId)
        .in('status', ['COMPLETED', 'AWAITING_RECEIVER_SIGNATURE']);

      if (currentError) throw currentError;
      
      // Filter manifests using signed_at with created_at fallback (matching dashboard logic)
      // Extract YYYY-MM-DD portion from ISO timestamps for proper date comparison
      const filteredCurrentManifests = currentManifests?.filter((m: any) => {
        const effectiveDateStr = m.signed_at || m.created_at;
        const effectiveDate = effectiveDateStr?.split('T')[0] || '';
        return effectiveDate >= effectiveCurrentStart && effectiveDate <= dates.currentEnd;
      }) || [];

      // Fetch current period dropoffs (include manifest_id to exclude linked manifests from pickup count)
      const { data: currentDropoffs, error: dropoffsError } = await supabase
        .from('dropoffs')
        .select(`
          id,
          client_id,
          manifest_id,
          computed_revenue,
          dropoff_date,
          pte_count,
          otr_count,
          tractor_count,
          clients!inner(id, company_name)
        `)
        .eq('organization_id', organizationId)
        .gte('dropoff_date', effectiveCurrentStart)
        .lte('dropoff_date', dates.currentEnd);

      if (dropoffsError) throw dropoffsError;
      
      // Build set of manifest IDs linked to dropoffs (to exclude from pickup tire count - matches dashboard logic)
      const dropoffLinkedManifestIds = new Set(
        (currentDropoffs || [])
          .filter((d: any) => d.manifest_id)
          .map((d: any) => d.manifest_id)
      );

      // Fetch previous period pickups
      const { data: previousPickups, error: prevPickupsError } = await supabase
        .from('pickups')
        .select(`
          id,
          client_id,
          pickup_date,
          computed_revenue,
          final_revenue,
          status,
          clients!inner(id, company_name)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .gte('pickup_date', effectivePreviousStart)
        .lt('pickup_date', dates.previousEnd);

      if (prevPickupsError) throw prevPickupsError;

      // Fetch previous period manifests (for tire counts - include AWAITING_RECEIVER_SIGNATURE)
      const { data: previousManifests, error: previousError } = await supabase
        .from('manifests')
        .select(`
          id,
          client_id,
          created_at,
          signed_at,
          pte_on_rim,
          pte_off_rim,
          commercial_17_5_19_5_off,
          commercial_17_5_19_5_on,
          commercial_22_5_off,
          commercial_22_5_on,
          otr_count,
          tractor_count
        `)
        .eq('organization_id', organizationId)
        .in('status', ['COMPLETED', 'AWAITING_RECEIVER_SIGNATURE']);

      if (previousError) throw previousError;
      
      // Filter previous manifests using signed_at with created_at fallback
      // Extract YYYY-MM-DD portion from ISO timestamps for proper date comparison
      const filteredPreviousManifests = previousManifests?.filter((m: any) => {
        const effectiveDateStr = m.signed_at || m.created_at;
        const effectiveDate = effectiveDateStr?.split('T')[0] || '';
        return effectiveDate >= effectivePreviousStart && effectiveDate < dates.previousEnd;
      }) || [];

      // Fetch previous period dropoffs
      const { data: previousDropoffs, error: prevDropoffsError } = await supabase
        .from('dropoffs')
        .select(`
          id,
          client_id,
          computed_revenue,
          dropoff_date,
          pte_count,
          otr_count,
          tractor_count
        `)
        .eq('organization_id', organizationId)
        .gte('dropoff_date', effectivePreviousStart)
        .lt('dropoff_date', dates.previousEnd);

      if (prevDropoffsError) throw prevDropoffsError;

      // Fetch client pickup patterns
      const { data: patterns } = await supabase
        .from('client_pickup_patterns')
        .select('client_id, average_days_between_pickups, frequency, last_pickup_date')
        .eq('organization_id', organizationId);

      // Fetch all active clients
      const { data: allClients } = await supabase
        .from('clients')
        .select('id, company_name, last_pickup_at')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      // Build map of last dropoff per client (for at-risk logic)
      const clientLastDropoff = new Map<string, string>();
      currentDropoffs?.forEach((d: any) => {
        const existing = clientLastDropoff.get(d.client_id);
        if (!existing || d.dropoff_date > existing) {
          clientLastDropoff.set(d.client_id, d.dropoff_date);
        }
      });

      // Calculate pickup revenue from pickups table (use final_revenue or computed_revenue)
      const pickupRevenue = currentPickups?.reduce((sum, p: any) => {
        const revenue = Number(p.final_revenue) || Number(p.computed_revenue) || 0;
        return sum + revenue;
      }, 0) || 0;
      const totalPickupsCount = currentPickups?.length || 0;
      
      // Calculate dropoff revenue
      const dropoffRevenue = currentDropoffs?.reduce((sum, d: any) => sum + (Number(d.computed_revenue) || 0), 0) || 0;
      
      // Combined total revenue
      const totalRevenue = pickupRevenue + dropoffRevenue;
      
      // Calculate total tires (PTEs) from manifests (tire counts) and dropoffs
      // Exclude manifests linked to dropoffs to avoid double-counting (matches dashboard RPC logic)
      const pickupManifests = filteredCurrentManifests.filter(
        (m: any) => !dropoffLinkedManifestIds.has(m.id)
      );
      
      const pickupTires = pickupManifests.reduce((sum, m: any) => {
        const pte = (Number(m.pte_on_rim) || 0) + (Number(m.pte_off_rim) || 0);
        // Commercial tires get 5x multiplier (same as semi/tractor - per Michigan conversion rates)
        const commercial = 5 * ((Number(m.commercial_17_5_19_5_off) || 0) + (Number(m.commercial_17_5_19_5_on) || 0) +
                          (Number(m.commercial_22_5_off) || 0) + (Number(m.commercial_22_5_on) || 0));
        const otr = (Number(m.otr_count) || 0) * 15;
        const tractor = (Number(m.tractor_count) || 0) * 5;
        return sum + pte + commercial + otr + tractor;
      }, 0);
      
      const dropoffTires = currentDropoffs?.reduce((sum, d: any) => {
        const pte = Number(d.pte_count) || 0;
        const otr = (Number(d.otr_count) || 0) * 15;
        const tractor = (Number(d.tractor_count) || 0) * 5;
        return sum + pte + otr + tractor;
      }, 0) || 0;
      
      const totalTires = pickupTires + dropoffTires;

      // Previous period calculations
      const previousPickupRevenue = previousPickups?.reduce((sum, p: any) => {
        const revenue = Number(p.final_revenue) || Number(p.computed_revenue) || 0;
        return sum + revenue;
      }, 0) || 0;
      const previousDropoffRevenue = previousDropoffs?.reduce((sum, d: any) => sum + (Number(d.computed_revenue) || 0), 0) || 0;
      const previousRevenue = previousPickupRevenue + previousDropoffRevenue;
      const previousPickupsCount = previousPickups?.length || 0;

      // Calculate changes
      const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
      const pickupsChange = previousPickupsCount > 0 ? ((totalPickupsCount - previousPickupsCount) / previousPickupsCount) * 100 : 0;

      // Group by client for segmentation (use pickups table for revenue data)
      const clientCurrentStats = new Map<string, { revenue: number; pickups: number; name: string }>();
      const clientPreviousStats = new Map<string, { revenue: number; pickups: number }>();

      // Include pickups in client stats
      currentPickups?.forEach((p: any) => {
        const clientId = p.client_id;
        const clientData = p.clients as any;
        const existing = clientCurrentStats.get(clientId) || { revenue: 0, pickups: 0, name: clientData?.company_name || 'Unknown' };
        existing.revenue += Number(p.final_revenue) || Number(p.computed_revenue) || 0;
        existing.pickups += 1;
        clientCurrentStats.set(clientId, existing);
      });

      // Include dropoffs in client stats
      currentDropoffs?.forEach((d: any) => {
        const clientId = d.client_id;
        const clientData = d.clients as any;
        const existing = clientCurrentStats.get(clientId) || { revenue: 0, pickups: 0, name: clientData?.company_name || 'Unknown' };
        existing.revenue += Number(d.computed_revenue) || 0;
        existing.pickups += 1;
        clientCurrentStats.set(clientId, existing);
      });

      previousPickups?.forEach((p: any) => {
        const clientId = p.client_id;
        const existing = clientPreviousStats.get(clientId) || { revenue: 0, pickups: 0 };
        existing.revenue += Number(p.final_revenue) || Number(p.computed_revenue) || 0;
        existing.pickups += 1;
        clientPreviousStats.set(clientId, existing);
      });

      previousDropoffs?.forEach((d: any) => {
        const clientId = d.client_id;
        const existing = clientPreviousStats.get(clientId) || { revenue: 0, pickups: 0 };
        existing.revenue += Number(d.computed_revenue) || 0;
        existing.pickups += 1;
        clientPreviousStats.set(clientId, existing);
      });

      // Build client segments
      const patternMap = new Map(patterns?.map(p => [p.client_id, p]) || []);
      const clientMap = new Map(allClients?.map(c => [c.id, c]) || []);
      
      const growingClients: ClientSegment[] = [];
      const stableClients: ClientSegment[] = [];
      const decliningClients: ClientSegment[] = [];
      const newClients: ClientSegment[] = [];
      const atRiskClients: ClientSegment[] = [];

      // Process clients with current activity
      clientCurrentStats.forEach((current, clientId) => {
        const previous = clientPreviousStats.get(clientId);
        const pattern = patternMap.get(clientId);
        const client = clientMap.get(clientId);
        const lastPickup = pattern?.last_pickup_date || client?.last_pickup_at;
        const daysSince = lastPickup ? differenceInDays(now, new Date(lastPickup)) : 999;

        const segment: ClientSegment = {
          client_id: clientId,
          company_name: current.name,
          current_revenue: current.revenue,
          previous_revenue: previous?.revenue || 0,
          current_pickups: current.pickups,
          previous_pickups: previous?.pickups || 0,
          change_percent: previous?.revenue ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 100,
          last_pickup_date: lastPickup || null,
          days_since_pickup: daysSince,
          expected_frequency_days: pattern?.average_days_between_pickups ? Number(pattern.average_days_between_pickups) : null,
        };

        if (!previous || previous.pickups === 0) {
          newClients.push(segment);
        } else if (segment.change_percent > 20) {
          growingClients.push(segment);
        } else if (segment.change_percent < -20) {
          decliningClients.push(segment);
        } else {
          stableClients.push(segment);
        }
      });

      // Find at-risk clients (no activity in current period but had activity before)
      // Also check if they have recent dropoffs - if so, they're NOT at-risk
      clientMap.forEach((client, clientId) => {
        if (!clientCurrentStats.has(clientId)) {
          const pattern = patternMap.get(clientId);
          const previous = clientPreviousStats.get(clientId);
          const lastPickup = pattern?.last_pickup_date || client?.last_pickup_at;
          const daysSincePickup = lastPickup ? differenceInDays(now, new Date(lastPickup)) : 999;
          const expectedFreq = pattern?.average_days_between_pickups ? Number(pattern.average_days_between_pickups) : 30;
          
          // Check for recent dropoff activity - if client has recent dropoff, not at-risk
          const lastDropoff = clientLastDropoff.get(clientId);
          const daysSinceDropoff = lastDropoff ? differenceInDays(now, new Date(lastDropoff)) : 999;
          
          // Only at-risk if BOTH no recent pickup AND no recent dropoff
          const isOverdue = daysSincePickup > expectedFreq * 1.5 && daysSinceDropoff > expectedFreq * 1.5;
          const hadPreviousActivity = previous && previous.pickups > 0;

          if (isOverdue || (hadPreviousActivity && daysSinceDropoff > expectedFreq)) {
            atRiskClients.push({
              client_id: clientId,
              company_name: client.company_name,
              current_revenue: 0,
              previous_revenue: previous?.revenue || 0,
              current_pickups: 0,
              previous_pickups: previous?.pickups || 0,
              change_percent: -100,
              last_pickup_date: lastPickup || null,
              days_since_pickup: Math.min(daysSincePickup, daysSinceDropoff), // Use most recent activity
              expected_frequency_days: expectedFreq,
            });
          }
        }
      });

      // Sort segments
      growingClients.sort((a, b) => b.change_percent - a.change_percent);
      decliningClients.sort((a, b) => a.change_percent - b.change_percent);
      atRiskClients.sort((a, b) => b.days_since_pickup - a.days_since_pickup);

      // Revenue by day of week (use pickups for revenue, dropoffs)
      const dayStats = new Map<number, { revenue: number; pickups: number }>();
      currentPickups?.forEach((p: any) => {
        const day = new Date(p.pickup_date).getDay();
        const existing = dayStats.get(day) || { revenue: 0, pickups: 0 };
        existing.revenue += Number(p.final_revenue) || Number(p.computed_revenue) || 0;
        existing.pickups += 1;
        dayStats.set(day, existing);
      });
      currentDropoffs?.forEach((d: any) => {
        const day = new Date(d.dropoff_date).getDay();
        const existing = dayStats.get(day) || { revenue: 0, pickups: 0 };
        existing.revenue += Number(d.computed_revenue) || 0;
        existing.pickups += 1;
        dayStats.set(day, existing);
      });

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const revenueByDay: RevenueByDay[] = dayNames.map((name, i) => ({
        day: name.slice(0, 3),
        dayName: name,
        revenue: dayStats.get(i)?.revenue || 0,
        pickups: dayStats.get(i)?.pickups || 0,
      }));

      // Revenue trend (use pickups for revenue, dropoffs)
      const trendDays = period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 90 : 365;
      const trendMap = new Map<string, { revenue: number; pickups: number }>();
      
      currentPickups?.forEach((p: any) => {
        const date = format(new Date(p.pickup_date), 'yyyy-MM-dd');
        const existing = trendMap.get(date) || { revenue: 0, pickups: 0 };
        existing.revenue += Number(p.final_revenue) || Number(p.computed_revenue) || 0;
        existing.pickups += 1;
        trendMap.set(date, existing);
      });
      currentDropoffs?.forEach((d: any) => {
        const date = format(new Date(d.dropoff_date), 'yyyy-MM-dd');
        const existing = trendMap.get(date) || { revenue: 0, pickups: 0 };
        existing.revenue += Number(d.computed_revenue) || 0;
        existing.pickups += 1;
        trendMap.set(date, existing);
      });

      const revenueTrend: RevenueTrend[] = [];
      for (let i = trendDays - 1; i >= 0; i--) {
        const date = format(new Date(now.getTime() - i * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
        const data = trendMap.get(date) || { revenue: 0, pickups: 0 };
        revenueTrend.push({ date, ...data });
      }

      // Revenue concentration
      const clientRevenues = Array.from(clientCurrentStats.entries())
        .map(([id, data]) => ({ id, name: data.name, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      const top3Revenue = clientRevenues.slice(0, 3).reduce((sum, c) => sum + c.revenue, 0);
      const top5Revenue = clientRevenues.slice(0, 5).reduce((sum, c) => sum + c.revenue, 0);
      const top10Revenue = clientRevenues.slice(0, 10).reduce((sum, c) => sum + c.revenue, 0);

      const concentration: ConcentrationData = {
        top3Percent: totalRevenue > 0 ? (top3Revenue / totalRevenue) * 100 : 0,
        top5Percent: totalRevenue > 0 ? (top5Revenue / totalRevenue) * 100 : 0,
        top10Percent: totalRevenue > 0 ? (top10Revenue / totalRevenue) * 100 : 0,
        topClients: clientRevenues.slice(0, 5).map(c => ({
          name: c.name,
          revenue: c.revenue,
          percent: totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0,
        })),
      };

      // Generate actionable insights
      const insights: ActionableInsight[] = [];

      if (concentration.top3Percent > 50) {
        insights.push({
          type: 'warning',
          title: 'High Revenue Concentration',
          description: `${Math.round(concentration.top3Percent)}% of revenue comes from just 3 clients. Consider diversifying your client base.`,
        });
      }

      if (growingClients.length > 0) {
        insights.push({
          type: 'success',
          title: `${growingClients.length} Growing Clients`,
          description: `${growingClients[0].company_name} leads with ${Math.round(growingClients[0].change_percent)}% growth. Nurture these relationships!`,
        });
      }

      if (atRiskClients.length > 0) {
        const topRisk = atRiskClients[0];
        insights.push({
          type: 'alert',
          title: `${atRiskClients.length} At-Risk Clients`,
          description: `${topRisk.company_name} hasn't had a pickup in ${topRisk.days_since_pickup} days. Consider reaching out.`,
          action: 'Schedule Pickup',
          clientId: topRisk.client_id,
        });
      }

      const bestDay = revenueByDay.reduce((best, day) => day.revenue > best.revenue ? day : best, revenueByDay[0]);
      if (bestDay.revenue > 0) {
        insights.push({
          type: 'info',
          title: `${bestDay.dayName}s Are Your Best Day`,
          description: `${bestDay.dayName}s generate ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(bestDay.revenue)} in revenue. Consider prioritizing scheduling on this day.`,
        });
      }

      if (revenueChange > 10) {
        insights.push({
          type: 'success',
          title: 'Revenue Is Growing!',
          description: `Revenue is up ${Math.round(revenueChange)}% compared to last ${period}. Keep up the momentum!`,
        });
      } else if (revenueChange < -10) {
        insights.push({
          type: 'warning',
          title: 'Revenue Declining',
          description: `Revenue is down ${Math.abs(Math.round(revenueChange))}% compared to last ${period}. Review your client engagement.`,
        });
      }

      return {
        totalRevenue,
        totalPickups: totalPickupsCount,
        totalTires,
        activeClients: clientCurrentStats.size,
        pickupRevenue,
        dropoffRevenue,
        previousRevenue,
        previousPickups: previousPickupsCount,
        revenueChange,
        pickupsChange,
        growingClients: growingClients.slice(0, 10),
        stableClients: stableClients.slice(0, 10),
        decliningClients: decliningClients.slice(0, 10),
        newClients: newClients.slice(0, 10),
        atRiskClients: atRiskClients.slice(0, 10),
        revenueByDay,
        revenueTrend,
        concentration,
        insights,
      };
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
};
