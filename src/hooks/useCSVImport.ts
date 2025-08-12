import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImportData {
  csvData: any[];
  dryRun?: boolean;
}

interface ImportResult {
  success: boolean;
  errors?: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  preview?: {
    clients: any[];
    locations: any[];
    totalClients: number;
    totalLocations: number;
  };
  clientsProcessed?: number;
  locationsProcessed?: number;
}

export const useCSVImport = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ImportData): Promise<ImportResult> => {
      const { data: result, error } = await supabase.functions.invoke('csv-import', {
        body: data
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (result, variables) => {
      if (result.success && !variables.dryRun) {
        toast({
          title: "Import Successful",
          description: `Processed ${result.clientsProcessed} clients and ${result.locationsProcessed} locations`
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
};

export const parseCSV = (csvText: string): any[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
};

export const generateCSVTemplate = (): string => {
  const headers = [
    'clientName',
    'type',
    'contactName',
    'email',
    'phone',
    'locationName',
    'address',
    'notes',
    'tags',
    'pricingTierName'
  ];

  const sampleRow = [
    'ABC Trucking Co.',
    'commercial',
    'John Smith',
    'john@abctruck.com',
    '+15551234567',
    'Main Warehouse',
    '123 Industrial Blvd, Austin, TX 78701',
    'Back gate access required',
    'fleet;priority',
    'Standard'
  ];

  return [headers.join(','), sampleRow.join(',')].join('\n');
};