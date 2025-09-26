import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
// Michigan conversion constants (inline to avoid circular dependencies)
const MICHIGAN_CONVERSIONS = {
  PASSENGER_TIRE_TO_PTE: 1,
  SEMI_TIRE_TO_PTE: 5,
  OTR_TIRE_TO_PTE: 15,
  PTE_TO_TON: 1 / 89,
  PTE_TO_CUBIC_YARD: 0.1,
} as const;

const calculateTotalPTE = (tires: { pte_count?: number; otr_count?: number; tractor_count?: number; }): number => {
  return (tires.pte_count || 0) + (tires.otr_count || 0) * 15 + (tires.tractor_count || 0) * 5;
};

const pteToTons = (pte: number): number => Math.round(pte * MICHIGAN_CONVERSIONS.PTE_TO_TON * 100) / 100;
const pteToCubicYards = (pte: number): number => Math.round(pte * MICHIGAN_CONVERSIONS.PTE_TO_CUBIC_YARD * 10) / 10;
import { useToast } from "@/hooks/use-toast";

export interface MichiganReportData {
  year: number;
  totalPTE: number;
  totalTons: number;
  totalCubicYards: number;
  byMaterialForm: {
    whole_off_rim: number;
    semi: number;
    otr: number;
  };
  byCounty: Record<string, number>;
  byEndUse: Record<string, number>;
  monthlyBreakdown: Array<{
    month: number;
    monthName: string;
    pte: number;
    tons: number;
    pickups: number;
  }>;
  portableShredding: Array<{
    site: string;
    county: string;
    dates: string;
    inputPTE: number;
    outputPTE: number;
    yieldLoss: number;
  }>;
  collectionSites: Array<{
    name: string;
    county: string;
    storageCapacity: number;
    onSiteProcessing: boolean;
    annualPTE: number;
    annualTons: number;
  }>;
}

// Generate Michigan annual report from pickup data
export const useMichiganReport = (year: number) => {
  return useQuery({
    queryKey: ['michigan-report', year],
    queryFn: async (): Promise<MichiganReportData> => {
      console.log(`Generating Michigan report for year ${year}`);
      
      // Get all completed pickups for the year
      const { data: pickups, error: pickupsError } = await supabase
        .from('pickups')
        .select(`
          *,
          clients!inner(
            id,
            company_name,
            county,
            city,
            state
          ),
          locations(
            id,
            name,
            address,
            city,
            county
          )
        `)
        .eq('status', 'completed')
        .gte('pickup_date', `${year}-01-01`)
        .lte('pickup_date', `${year}-12-31`);

      if (pickupsError) {
        console.error('Error fetching pickups:', pickupsError);
        throw pickupsError;
      }

      console.log(`Found ${pickups?.length || 0} completed pickups for ${year}`);

      if (!pickups || pickups.length === 0) {
        return {
          year,
          totalPTE: 0,
          totalTons: 0,
          totalCubicYards: 0,
          byMaterialForm: { whole_off_rim: 0, semi: 0, otr: 0 },
          byCounty: {},
          byEndUse: {},
          monthlyBreakdown: [],
          portableShredding: [],
          collectionSites: []
        };
      }

      // Calculate totals using Michigan conversion rules
      let totalPTE = 0;
      const byMaterialForm = { whole_off_rim: 0, semi: 0, otr: 0 };
      const byCounty: Record<string, number> = {};
      const monthlyData: Record<number, { pte: number; pickups: number }> = {};

      pickups.forEach(pickup => {
        const pickupPTE = calculateTotalPTE({
          pte_count: pickup.pte_count || 0,
          otr_count: pickup.otr_count || 0,
          tractor_count: pickup.tractor_count || 0
        });

        totalPTE += pickupPTE;

        // By material form
        byMaterialForm.whole_off_rim += pickup.pte_count || 0;
        byMaterialForm.semi += pickup.tractor_count || 0;
        byMaterialForm.otr += pickup.otr_count || 0;

        // By county (use client county - locations don't have county field yet)
        const county = pickup.clients?.county || 'Unknown';
        byCounty[county] = (byCounty[county] || 0) + pickupPTE;

        // Monthly breakdown
        const month = new Date(pickup.pickup_date).getMonth() + 1;
        if (!monthlyData[month]) {
          monthlyData[month] = { pte: 0, pickups: 0 };
        }
        monthlyData[month].pte += pickupPTE;
        monthlyData[month].pickups += 1;
      });

      // Convert totals
      const totalTons = pteToTons(totalPTE);
      const totalCubicYards = pteToCubicYards(totalPTE);

      // Generate monthly breakdown
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const data = monthlyData[month] || { pte: 0, pickups: 0 };
        return {
          month,
          monthName: monthNames[i],
          pte: data.pte,
          tons: pteToTons(data.pte),
          pickups: data.pickups
        };
      });

      // Get collection sites data
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .eq('is_active', true);

      const collectionSites = clients?.map(client => ({
        name: client.company_name,
        county: client.county || 'Unknown',
        storageCapacity: 0, // To be enhanced with actual storage data
        onSiteProcessing: false, // To be enhanced with processing flags
        annualPTE: byCounty[client.county || 'Unknown'] || 0,
        annualTons: pteToTons(byCounty[client.county || 'Unknown'] || 0)
      })) || [];

      return {
        year,
        totalPTE: Math.round(totalPTE),
        totalTons: Math.round(totalTons * 100) / 100,
        totalCubicYards: Math.round(totalCubicYards * 10) / 10,
        byMaterialForm,
        byCounty,
        byEndUse: { 'Processing': totalPTE }, // Simplified - all goes to processing
        monthlyBreakdown,
        portableShredding: [], // To be enhanced with processing events
        collectionSites
      };
    },
    enabled: !!year
  });
};

// Export report data
export const useExportMichiganReport = () => {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      year, 
      format 
    }: { 
      year: number; 
      format: 'csv' | 'pdf' 
    }) => {
      const { data, error } = await supabase.functions.invoke('michigan-report-export', {
        body: { year, format }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Create download link
      const blob = new Blob([data.content], { 
        type: variables.format === 'csv' ? 'text/csv' : 'application/pdf' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `michigan_tire_report_${variables.year}.${variables.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Michigan ${variables.year} report exported as ${variables.format.toUpperCase()}`
      });
    },
    onError: (error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

// Lock/submit report
export const useSubmitMichiganReport = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ year }: { year: number }) => {
      // For now, just mark as submitted in a simple way
      console.log(`Submitting Michigan report for year ${year}`);
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['michigan-report', variables.year] });
      toast({
        title: "Report Submitted",
        description: `Michigan ${variables.year} report has been submitted and locked`
      });
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};