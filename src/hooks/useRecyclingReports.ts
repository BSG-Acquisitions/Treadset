import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MonthlyReport {
  month: number;
  manifests: number;
  totalTires: number;
  totalPTE: number;
  totalWeight: number;
}

interface QuarterlyReport {
  quarter: number;
  manifests: number;
  totalTires: number;
  totalPTE: number;
  totalWeight: number;
}

interface TireTypeReport {
  type: string;
  count: number;
}

interface RecyclingReportsData {
  summary: {
    totalManifests: number;
    totalTires: number;
    totalPTE: number;
    totalWeight: number;
  };
  monthly: MonthlyReport[];
  quarterly: QuarterlyReport[];
  tireTypes: TireTypeReport[];
}

export const useRecyclingReports = (year: number = new Date().getFullYear()) => {
  return useQuery({
    queryKey: ['recycling-reports', year],
    queryFn: async (): Promise<RecyclingReportsData> => {
      // Fetch manifests using completion time when available; include awaiting receiver signatures
      const { data: manifests, error: manifestsError } = await supabase
        .from('manifests')
        .select(`
          id,
          signed_at,
          created_at,
          pte_off_rim,
          pte_on_rim,
          commercial_17_5_19_5_off,
          commercial_17_5_19_5_on,
          commercial_22_5_off,
          commercial_22_5_on,
          otr_count,
          tractor_count,
          weight_tons
        `)
        .in('status', ['COMPLETED', 'AWAITING_RECEIVER_SIGNATURE'])
        .or(
          `and(signed_at.gte.${year}-01-01,signed_at.lt.${year + 1}-01-01),and(signed_at.is.null,created_at.gte.${year}-01-01,created_at.lt.${year + 1}-01-01)`
        )
        .order('signed_at', { ascending: true });

      if (manifestsError) {
        console.error('Error fetching manifests:', manifestsError);
        throw manifestsError;
      }

      // Fetch dropoffs
      const { data: dropoffs, error: dropoffsError } = await supabase
        .from('dropoffs')
        .select('id, dropoff_date, pte_count, otr_count, tractor_count, manifest_id')
        .is('manifest_id', null)
        .gte('dropoff_date', `${year}-01-01`)
        .lt('dropoff_date', `${year + 1}-01-01`)
        .order('dropoff_date', { ascending: true });

      if (dropoffsError) {
        console.error('Error fetching dropoffs:', dropoffsError);
        throw dropoffsError;
      }

      // Initialize monthly data (12 months)
      const monthlyData: MonthlyReport[] = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        manifests: 0,
        totalTires: 0,
        totalPTE: 0,
        totalWeight: 0
      }));

      // Initialize quarterly data (4 quarters)
      const quarterlyData: QuarterlyReport[] = Array.from({ length: 4 }, (_, i) => ({
        quarter: i + 1,
        manifests: 0,
        totalTires: 0,
        totalPTE: 0,
        totalWeight: 0
      }));

      // Initialize tire type counters
      const tireTypeCounts = {
        'PTE Off Rim': 0,
        'PTE On Rim': 0,
        'Commercial 17.5-19.5 Off': 0,
        'Commercial 17.5-19.5 On': 0,
        'Commercial 22.5+ Off': 0,
        'Commercial 22.5+ On': 0,
        'OTR': 0,
        'Tractor': 0
      };

      let totalManifests = 0;
      let totalTires = 0;
      let totalPTE = 0;
      let totalWeight = 0;

      // Process manifests
      (manifests || []).forEach((manifest) => {
        const eventDateStr = (manifest as any).signed_at ?? (manifest as any).created_at;
        if (!eventDateStr) return; // Skip if no date
        const eventDate = new Date(eventDateStr as string);
        if (isNaN(eventDate.getTime())) return; // Guard against invalid dates
        const month = eventDate.getMonth(); // 0-based
        const quarter = Math.floor(month / 3); // 0-based

        // Calculate tire counts with Michigan PTE conversions
        const pteOffRim = manifest.pte_off_rim || 0;
        const pteOnRim = manifest.pte_on_rim || 0;
        const comm175Off = manifest.commercial_17_5_19_5_off || 0;
        const comm175On = manifest.commercial_17_5_19_5_on || 0;
        const comm225Off = manifest.commercial_22_5_off || 0;
        const comm225On = manifest.commercial_22_5_on || 0;
        const otr = manifest.otr_count || 0;
        const tractor = manifest.tractor_count || 0;
        const weight = manifest.weight_tons || 0;

        // Raw tire count
        const manifestTotalTires = pteOffRim + pteOnRim + comm175Off + comm175On + comm225Off + comm225On + otr + tractor;
        
        // Michigan PTE conversion: passenger=1, tractor=5, OTR=15
        const manifestPTE = (pteOffRim + pteOnRim + comm175Off + comm175On + comm225Off + comm225On) + (tractor * 5) + (otr * 15);

        // Update monthly data
        monthlyData[month].manifests += 1;
        monthlyData[month].totalTires += manifestTotalTires;
        monthlyData[month].totalPTE += manifestPTE;
        monthlyData[month].totalWeight += weight;

        // Update quarterly data
        quarterlyData[quarter].manifests += 1;
        quarterlyData[quarter].totalTires += manifestTotalTires;
        quarterlyData[quarter].totalPTE += manifestPTE;
        quarterlyData[quarter].totalWeight += weight;

        // Update tire type counts
        tireTypeCounts['PTE Off Rim'] += pteOffRim;
        tireTypeCounts['PTE On Rim'] += pteOnRim;
        tireTypeCounts['Commercial 17.5-19.5 Off'] += comm175Off;
        tireTypeCounts['Commercial 17.5-19.5 On'] += comm175On;
        tireTypeCounts['Commercial 22.5+ Off'] += comm225Off;
        tireTypeCounts['Commercial 22.5+ On'] += comm225On;
        tireTypeCounts['OTR'] += otr;
        tireTypeCounts['Tractor'] += tractor;

        // Update totals
        totalManifests += 1;
        totalTires += manifestTotalTires;
        totalPTE += manifestPTE;
        totalWeight += weight;
      });

      // Process dropoffs
      (dropoffs || []).forEach((dropoff) => {
        const dropoffDate = new Date(dropoff.dropoff_date);
        const month = dropoffDate.getMonth();
        const quarter = Math.floor(month / 3);

        const pte = dropoff.pte_count || 0;
        const otr = dropoff.otr_count || 0;
        const tractor = dropoff.tractor_count || 0;

        const dropoffTotalTires = pte + otr + tractor;
        const dropoffPTE = pte + (tractor * 5) + (otr * 15);

        monthlyData[month].totalTires += dropoffTotalTires;
        monthlyData[month].totalPTE += dropoffPTE;

        quarterlyData[quarter].totalTires += dropoffTotalTires;
        quarterlyData[quarter].totalPTE += dropoffPTE;

        tireTypeCounts['PTE Off Rim'] += pte; // Dropoffs don't distinguish on/off rim
        tireTypeCounts['OTR'] += otr;
        tireTypeCounts['Tractor'] += tractor;

        totalTires += dropoffTotalTires;
        totalPTE += dropoffPTE;
      });

      // Convert tire type counts to array format
      const tireTypes: TireTypeReport[] = Object.entries(tireTypeCounts)
        .map(([type, count]) => ({ type, count }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);

      return {
        summary: {
          totalManifests,
          totalTires,
          totalPTE,
          totalWeight
        },
        monthly: monthlyData,
        quarterly: quarterlyData,
        tireTypes
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: true, // Refetch when window gains focus for live updates
  });
};