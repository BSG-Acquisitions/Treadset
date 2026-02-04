import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { 
  calculateManifestPTE, 
  calculateTotalPTE, 
  pteToTons,
  convertToTons,
  MICHIGAN_CONVERSIONS,
  type ConvertibleUnit
} from "@/lib/michigan-conversions";

export interface RawMaterialProjections {
  // Current state
  totalUnprocessedPTE: number;
  totalUnprocessedTons: number;
  
  // This period intake
  periodIntakePTE: number;
  periodIntakeTons: number;
  dailyAveragePTE: number;
  dailyAverageTons: number;
  
  // Processing output (from inventory inbound transactions)
  periodProcessedTons: number;
  processingRate: number; // tons processed per day
  
  // Projections
  projectedMonthEndTons: number;
  daysOfSupplyRemaining: number; // at current processing rate
  
  // Breakdown by source
  intakeBySource: {
    manifests: { pte: number; tons: number; count: number };
    dropoffs: { pte: number; tons: number; count: number };
  };
  
  // Trend data for charts
  dailyIntake: Array<{
    date: string;
    pte: number;
    tons: number;
    source: 'manifest' | 'dropoff';
  }>;
  
  // Period info
  periodStart: Date;
  periodEnd: Date;
  daysInPeriod: number;
  daysElapsed: number;
}

interface ManifestRow {
  created_at: string;
  pte_on_rim: number | null;
  pte_off_rim: number | null;
  commercial_17_5_19_5_off: number | null;
  commercial_17_5_19_5_on: number | null;
  commercial_22_5_off: number | null;
  commercial_22_5_on: number | null;
  otr_count: number | null;
  tractor_count: number | null;
}

interface DropoffRow {
  dropoff_date: string;
  pte_count: number | null;
  otr_count: number | null;
  tractor_count: number | null;
}

interface InventoryTransaction {
  transaction_date: string;
  transaction_type: string;
  quantity: number;
  unit_of_measure: string;
}

export const useRawMaterialProjections = (periodStart?: Date, periodEnd?: Date) => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;
  
  // Default to current month
  const start = periodStart || startOfMonth(new Date());
  const end = periodEnd || endOfMonth(new Date());
  
  return useQuery({
    queryKey: ['raw-material-projections', orgId, start.toISOString(), end.toISOString()],
    queryFn: async (): Promise<RawMaterialProjections> => {
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      
      // Fetch manifests, dropoffs, and inventory transactions in parallel
      const [manifestsResult, dropoffsResult, transactionsResult, allTimeManifests, allTimeDropoffs] = await Promise.all([
        // Period manifests
        supabase
          .from('manifests')
          .select('created_at, pte_on_rim, pte_off_rim, commercial_17_5_19_5_off, commercial_17_5_19_5_on, commercial_22_5_off, commercial_22_5_on, otr_count, tractor_count')
          .eq('organization_id', orgId!)
          .gte('created_at', startStr)
          .lte('created_at', endStr),
        
        // Period dropoffs
        supabase
          .from('dropoffs')
          .select('dropoff_date, pte_count, otr_count, tractor_count')
          .eq('organization_id', orgId!)
          .gte('dropoff_date', startStr)
          .lte('dropoff_date', endStr),
        
        // Period inventory transactions (inbound = processing output)
        supabase
          .from('inventory_transactions')
          .select('transaction_date, transaction_type, quantity, unit_of_measure')
          .eq('organization_id', orgId!)
          .eq('transaction_type', 'inbound')
          .gte('transaction_date', startStr)
          .lte('transaction_date', endStr),
        
        // All-time manifests for total unprocessed calculation
        supabase
          .from('manifests')
          .select('created_at, pte_on_rim, pte_off_rim, commercial_17_5_19_5_off, commercial_17_5_19_5_on, commercial_22_5_off, commercial_22_5_on, otr_count, tractor_count')
          .eq('organization_id', orgId!),
        
        // All-time dropoffs
        supabase
          .from('dropoffs')
          .select('dropoff_date, pte_count, otr_count, tractor_count')
          .eq('organization_id', orgId!)
      ]);
      
      if (manifestsResult.error) throw manifestsResult.error;
      if (dropoffsResult.error) throw dropoffsResult.error;
      if (transactionsResult.error) throw transactionsResult.error;
      if (allTimeManifests.error) throw allTimeManifests.error;
      if (allTimeDropoffs.error) throw allTimeDropoffs.error;
      
      const manifests = (manifestsResult.data || []) as ManifestRow[];
      const dropoffs = (dropoffsResult.data || []) as DropoffRow[];
      const transactions = (transactionsResult.data || []) as InventoryTransaction[];
      
      // Calculate period intake from manifests
      let manifestPTE = 0;
      const dailyIntake: RawMaterialProjections['dailyIntake'] = [];
      
      for (const m of manifests) {
        const pte = calculateManifestPTE({
          pte_on_rim: m.pte_on_rim ?? 0,
          pte_off_rim: m.pte_off_rim ?? 0,
          commercial_17_5_19_5_off: m.commercial_17_5_19_5_off ?? 0,
          commercial_17_5_19_5_on: m.commercial_17_5_19_5_on ?? 0,
          commercial_22_5_off: m.commercial_22_5_off ?? 0,
          commercial_22_5_on: m.commercial_22_5_on ?? 0,
          otr_count: m.otr_count ?? 0,
          tractor_count: m.tractor_count ?? 0
        });
        manifestPTE += pte;
        
        dailyIntake.push({
          date: m.created_at.split('T')[0],
          pte,
          tons: pteToTons(pte, 'none'),
          source: 'manifest'
        });
      }
      
      // Calculate period intake from dropoffs
      let dropoffPTE = 0;
      for (const d of dropoffs) {
        const pte = calculateTotalPTE({
          pte_count: d.pte_count ?? 0,
          otr_count: d.otr_count ?? 0,
          tractor_count: d.tractor_count ?? 0
        });
        dropoffPTE += pte;
        
        dailyIntake.push({
          date: d.dropoff_date,
          pte,
          tons: pteToTons(pte, 'none'),
          source: 'dropoff'
        });
      }
      
      const periodIntakePTE = manifestPTE + dropoffPTE;
      const periodIntakeTons = pteToTons(periodIntakePTE, 'report');
      
      // Calculate all-time intake for unprocessed total
      let allTimeManifestPTE = 0;
      for (const m of (allTimeManifests.data || []) as ManifestRow[]) {
        allTimeManifestPTE += calculateManifestPTE({
          pte_on_rim: m.pte_on_rim ?? 0,
          pte_off_rim: m.pte_off_rim ?? 0,
          commercial_17_5_19_5_off: m.commercial_17_5_19_5_off ?? 0,
          commercial_17_5_19_5_on: m.commercial_17_5_19_5_on ?? 0,
          commercial_22_5_off: m.commercial_22_5_off ?? 0,
          commercial_22_5_on: m.commercial_22_5_on ?? 0,
          otr_count: m.otr_count ?? 0,
          tractor_count: m.tractor_count ?? 0
        });
      }
      
      let allTimeDropoffPTE = 0;
      for (const d of (allTimeDropoffs.data || []) as DropoffRow[]) {
        allTimeDropoffPTE += calculateTotalPTE({
          pte_count: d.pte_count ?? 0,
          otr_count: d.otr_count ?? 0,
          tractor_count: d.tractor_count ?? 0
        });
      }
      
      const totalIntakePTE = allTimeManifestPTE + allTimeDropoffPTE;
      
      // Calculate processing output using centralized conversion
      let periodProcessedTons = 0;
      for (const t of transactions) {
        const unit = t.unit_of_measure as ConvertibleUnit;
        periodProcessedTons += convertToTons(t.quantity, unit);
      }
      
      // Calculate total processed all-time (for unprocessed calculation)
      const allTimeTransactions = await supabase
        .from('inventory_transactions')
        .select('quantity, unit_of_measure')
        .eq('organization_id', orgId!)
        .eq('transaction_type', 'inbound');
      
      let totalProcessedTons = 0;
      for (const t of (allTimeTransactions.data || []) as { quantity: number; unit_of_measure: string }[]) {
        const unit = t.unit_of_measure as ConvertibleUnit;
        totalProcessedTons += convertToTons(t.quantity, unit);
      }
      
      // Unprocessed = Total intake (in tons) - Total processed
      const totalIntakeTons = pteToTons(totalIntakePTE, 'none');
      const totalUnprocessedTons = Math.max(0, totalIntakeTons - totalProcessedTons);
      const totalUnprocessedPTE = totalUnprocessedTons * MICHIGAN_CONVERSIONS.TON_TO_PTE;
      
      // Calculate daily averages
      const daysInPeriod = differenceInDays(end, start) + 1;
      const today = new Date();
      const daysElapsed = Math.min(differenceInDays(today, start) + 1, daysInPeriod);
      
      const dailyAveragePTE = daysElapsed > 0 ? periodIntakePTE / daysElapsed : 0;
      const dailyAverageTons = pteToTons(dailyAveragePTE, 'report');
      
      const processingRate = daysElapsed > 0 ? periodProcessedTons / daysElapsed : 0;
      
      // Projections
      const remainingDays = daysInPeriod - daysElapsed;
      const projectedAdditionalIntake = dailyAverageTons * remainingDays;
      const projectedAdditionalProcessed = processingRate * remainingDays;
      const projectedMonthEndTons = totalUnprocessedTons + projectedAdditionalIntake - projectedAdditionalProcessed;
      
      // Days of supply at current processing rate
      const daysOfSupplyRemaining = processingRate > 0 
        ? totalUnprocessedTons / processingRate 
        : totalUnprocessedTons > 0 ? Infinity : 0;
      
      return {
        totalUnprocessedPTE: Math.round(totalUnprocessedPTE),
        totalUnprocessedTons: Math.round(totalUnprocessedTons * 100) / 100,
        periodIntakePTE: Math.round(periodIntakePTE),
        periodIntakeTons,
        dailyAveragePTE: Math.round(dailyAveragePTE),
        dailyAverageTons,
        periodProcessedTons: Math.round(periodProcessedTons * 100) / 100,
        processingRate: Math.round(processingRate * 100) / 100,
        projectedMonthEndTons: Math.round(projectedMonthEndTons * 100) / 100,
        daysOfSupplyRemaining: daysOfSupplyRemaining === Infinity 
          ? Infinity 
          : Math.round(daysOfSupplyRemaining),
        intakeBySource: {
          manifests: {
            pte: Math.round(manifestPTE),
            tons: pteToTons(manifestPTE, 'report'),
            count: manifests.length
          },
          dropoffs: {
            pte: Math.round(dropoffPTE),
            tons: pteToTons(dropoffPTE, 'report'),
            count: dropoffs.length
          }
        },
        dailyIntake,
        periodStart: start,
        periodEnd: end,
        daysInPeriod,
        daysElapsed
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
