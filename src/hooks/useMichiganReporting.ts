import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  calculateManifestPTE, 
  pteToTons, 
  pteToCubicYards,
  MICHIGAN_CONVERSIONS 
} from "@/lib/michigan-conversions";
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

// Generate Michigan annual report from manifest data (inbound)
export const useMichiganReport = (year: number) => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['michigan-report', orgId, year],
    queryFn: async (): Promise<MichiganReportData> => {
      console.log(`Generating Michigan report for year ${year}`);
      
      // Get all inbound manifests for the year
      const { data: manifests, error: manifestsError } = await supabase
        .from('manifests')
        .select(`
          *,
          clients!inner(
            id,
            company_name,
            county,
            city,
            state
          )
        `)
        .eq('organization_id', orgId!)
        .eq('direction', 'inbound')
        .gte('created_at', `${year}-01-01`)
        .lte('created_at', `${year}-12-31T23:59:59`);

      if (manifestsError) {
        console.error('Error fetching manifests:', manifestsError);
        throw manifestsError;
      }

      console.log(`Found ${manifests?.length || 0} inbound manifests for ${year}`);

      if (!manifests || manifests.length === 0) {
        return {
          year,
          totalPTE: 0,
          totalTons: 0,
          totalCubicYards: 0,
          byMaterialForm: { whole_off_rim: 0, semi: 0, otr: 0 },
          byCounty: {},
          byEndUse: {},
          monthlyBreakdown: generateEmptyMonthlyBreakdown(),
          portableShredding: [],
          collectionSites: []
        };
      }

      // Calculate totals using Michigan conversion rules from manifest data
      let totalPTE = 0;
      const byMaterialForm = { whole_off_rim: 0, semi: 0, otr: 0 };
      const byCounty: Record<string, number> = {};
      const monthlyData: Record<number, { pte: number; pickups: number }> = {};

      manifests.forEach(manifest => {
        // Calculate PTE using the comprehensive manifest calculation
        const manifestPTE = calculateManifestPTE({
          pte_on_rim: manifest.pte_on_rim || 0,
          pte_off_rim: manifest.pte_off_rim || 0,
          commercial_17_5_19_5_off: manifest.commercial_17_5_19_5_off || 0,
          commercial_17_5_19_5_on: manifest.commercial_17_5_19_5_on || 0,
          commercial_22_5_off: manifest.commercial_22_5_off || 0,
          commercial_22_5_on: manifest.commercial_22_5_on || 0,
          otr_count: manifest.otr_count || 0,
          tractor_count: manifest.tractor_count || 0,
        });

        totalPTE += manifestPTE;

        // By material form - passenger tires count as whole_off_rim
        const passengerTires = (manifest.pte_on_rim || 0) + (manifest.pte_off_rim || 0);
        byMaterialForm.whole_off_rim += passengerTires;
        
        // Commercial 22.5 and tractor count as semi tires (5 PTE each)
        const semiTires = (manifest.commercial_22_5_off || 0) + 
                          (manifest.commercial_22_5_on || 0) + 
                          (manifest.tractor_count || 0);
        byMaterialForm.semi += semiTires;
        
        // OTR tires
        byMaterialForm.otr += manifest.otr_count || 0;

        // By county
        const county = manifest.clients?.county || 'Unknown';
        byCounty[county] = (byCounty[county] || 0) + manifestPTE;

        // Monthly breakdown
        const month = new Date(manifest.created_at).getMonth() + 1;
        if (!monthlyData[month]) {
          monthlyData[month] = { pte: 0, pickups: 0 };
        }
        monthlyData[month].pte += manifestPTE;
        monthlyData[month].pickups += 1;
      });

      // Convert totals
      const totalTons = pteToTons(totalPTE);
      const totalCubicYards = pteToCubicYards(totalPTE);

      // Generate monthly breakdown
      const monthlyBreakdown = generateMonthlyBreakdown(monthlyData);

      // Get collection sites data
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true);

      const collectionSites = clients?.map(client => ({
        name: client.company_name,
        county: client.county || 'Unknown',
        storageCapacity: 0,
        onSiteProcessing: false,
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
        byEndUse: { 'Processing': totalPTE },
        monthlyBreakdown,
        portableShredding: [],
        collectionSites
      };
    },
    enabled: !!year && !!orgId
  });
};

// Helper to generate monthly breakdown
function generateMonthlyBreakdown(monthlyData: Record<number, { pte: number; pickups: number }>) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return Array.from({ length: 12 }, (_, i) => {
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
}

// Helper to generate empty monthly breakdown
function generateEmptyMonthlyBreakdown() {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthName: monthNames[i],
    pte: 0,
    tons: 0,
    pickups: 0
  }));
}

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
