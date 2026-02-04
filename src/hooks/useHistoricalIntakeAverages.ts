import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { 
  calculateManifestPTE, 
  calculateTotalPTE, 
  pteToTons 
} from "@/lib/michigan-conversions";

interface MonthlyIntakeData {
  month: Date;
  monthLabel: string;
  manifests: { count: number; pte: number; tons: number };
  dropoffs: { count: number; pte: number; tons: number };
  totalPTE: number;
  totalTons: number;
  isPartial: boolean; // True if month is not yet complete
}

export interface HistoricalIntakeAverages {
  monthlyData: MonthlyIntakeData[];
  threeMonthAvgTons: number;
  sixMonthAvgTons: number;
  peakMonth: { month: Date; monthLabel: string; tons: number } | null;
  averageLoadsPerMonth: number;
  totalMonths: number;
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

export const useHistoricalIntakeAverages = (monthsBack: number = 6) => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;
  
  const now = new Date();
  const startDate = startOfMonth(subMonths(now, monthsBack - 1));
  const endDate = endOfMonth(now);
  
  return useQuery({
    queryKey: ['historical-intake-averages', orgId, monthsBack],
    queryFn: async (): Promise<HistoricalIntakeAverages> => {
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      
      // Fetch all manifests and dropoffs for the period
      const [manifestsResult, dropoffsResult] = await Promise.all([
        supabase
          .from('manifests')
          .select('created_at, pte_on_rim, pte_off_rim, commercial_17_5_19_5_off, commercial_17_5_19_5_on, commercial_22_5_off, commercial_22_5_on, otr_count, tractor_count')
          .eq('organization_id', orgId!)
          .gte('created_at', startStr)
          .lte('created_at', endStr),
        
        supabase
          .from('dropoffs')
          .select('dropoff_date, pte_count, otr_count, tractor_count')
          .eq('organization_id', orgId!)
          .gte('dropoff_date', startStr)
          .lte('dropoff_date', endStr)
      ]);
      
      if (manifestsResult.error) throw manifestsResult.error;
      if (dropoffsResult.error) throw dropoffsResult.error;
      
      const manifests = (manifestsResult.data || []) as ManifestRow[];
      const dropoffs = (dropoffsResult.data || []) as DropoffRow[];
      
      // Group by month
      const monthlyMap = new Map<string, MonthlyIntakeData>();
      
      // Initialize all months in range
      for (let i = 0; i < monthsBack; i++) {
        const monthDate = startOfMonth(subMonths(now, i));
        const key = format(monthDate, 'yyyy-MM');
        const isPartial = i === 0; // Current month is partial
        
        monthlyMap.set(key, {
          month: monthDate,
          monthLabel: format(monthDate, 'MMM yyyy'),
          manifests: { count: 0, pte: 0, tons: 0 },
          dropoffs: { count: 0, pte: 0, tons: 0 },
          totalPTE: 0,
          totalTons: 0,
          isPartial
        });
      }
      
      // Process manifests
      for (const m of manifests) {
        const key = m.created_at.substring(0, 7); // yyyy-MM
        const entry = monthlyMap.get(key);
        if (!entry) continue;
        
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
        
        entry.manifests.count++;
        entry.manifests.pte += pte;
      }
      
      // Process dropoffs
      for (const d of dropoffs) {
        const key = d.dropoff_date.substring(0, 7); // yyyy-MM
        const entry = monthlyMap.get(key);
        if (!entry) continue;
        
        const pte = calculateTotalPTE({
          pte_count: d.pte_count ?? 0,
          otr_count: d.otr_count ?? 0,
          tractor_count: d.tractor_count ?? 0
        });
        
        entry.dropoffs.count++;
        entry.dropoffs.pte += pte;
      }
      
      // Calculate totals and convert to tons
      const monthlyData: MonthlyIntakeData[] = [];
      
      for (const entry of monthlyMap.values()) {
        entry.manifests.tons = pteToTons(entry.manifests.pte, 'report');
        entry.dropoffs.tons = pteToTons(entry.dropoffs.pte, 'report');
        entry.totalPTE = entry.manifests.pte + entry.dropoffs.pte;
        entry.totalTons = pteToTons(entry.totalPTE, 'report');
        monthlyData.push(entry);
      }
      
      // Sort by date descending (most recent first)
      monthlyData.sort((a, b) => b.month.getTime() - a.month.getTime());
      
      // Calculate averages (exclude current partial month for averages)
      const completeMonths = monthlyData.filter(m => !m.isPartial);
      
      // 3-month average (exclude current month)
      const threeMonthData = completeMonths.slice(0, 3);
      const threeMonthAvgTons = threeMonthData.length > 0
        ? Math.round((threeMonthData.reduce((sum, m) => sum + m.totalTons, 0) / threeMonthData.length) * 100) / 100
        : 0;
      
      // 6-month average (exclude current month)
      const sixMonthData = completeMonths.slice(0, 6);
      const sixMonthAvgTons = sixMonthData.length > 0
        ? Math.round((sixMonthData.reduce((sum, m) => sum + m.totalTons, 0) / sixMonthData.length) * 100) / 100
        : 0;
      
      // Find peak month
      const peakMonth = completeMonths.length > 0
        ? completeMonths.reduce((peak, m) => m.totalTons > peak.totalTons ? m : peak)
        : null;
      
      // Average loads per month
      const totalLoads = completeMonths.reduce((sum, m) => 
        sum + m.manifests.count + m.dropoffs.count, 0);
      const averageLoadsPerMonth = completeMonths.length > 0
        ? Math.round(totalLoads / completeMonths.length)
        : 0;
      
      return {
        monthlyData,
        threeMonthAvgTons,
        sixMonthAvgTons,
        peakMonth: peakMonth ? {
          month: peakMonth.month,
          monthLabel: peakMonth.monthLabel,
          tons: peakMonth.totalTons
        } : null,
        averageLoadsPerMonth,
        totalMonths: completeMonths.length
      };
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
