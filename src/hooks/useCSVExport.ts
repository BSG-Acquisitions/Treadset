import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ExportData {
  type: 'clients' | 'pickups' | 'invoices';
  startDate?: string;
  endDate?: string;
}

export const useCSVExport = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ExportData): Promise<Blob> => {
      const { data: result, error } = await supabase.functions.invoke('csv-export', {
        body: data
      });

      if (error) throw error;

      // The result should be the CSV content as text
      return new Blob([result], { type: 'text/csv' });
    },
    onSuccess: (blob, variables) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const today = new Date().toISOString().split('T')[0];
      let filename = '';
      
      switch (variables.type) {
        case 'clients':
          filename = `clients_export_${today}.csv`;
          break;
        case 'pickups':
          filename = `pickups_export_${variables.startDate}_to_${variables.endDate}.csv`;
          break;
        case 'invoices':
          filename = `invoices_export_${today}.csv`;
          break;
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `${variables.type} data exported successfully`
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