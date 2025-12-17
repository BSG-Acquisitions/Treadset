import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface BackfillResult {
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
  details: Array<{
    clientId: string;
    companyName: string;
    city: string | null;
    zip: string | null;
    status: string;
  }>;
}

export const useBackfillGeography = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<BackfillResult | null>(null);
  const queryClient = useQueryClient();

  const runBackfill = async (options?: { forceUpdate?: boolean; batchSize?: number }) => {
    setIsLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('backfill-client-geography', {
        body: {
          forceUpdate: options?.forceUpdate ?? false,
          batchSize: options?.batchSize ?? 250
        }
      });

      if (error) throw error;

      setResults(data.results);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients-table'] });
      queryClient.invalidateQueries({ queryKey: ['service-zones'] });
      queryClient.invalidateQueries({ queryKey: ['zone-performance'] });

      toast.success(`Backfill complete: ${data.results.updated} clients updated`);
      
      return data;
    } catch (error: any) {
      console.error('Backfill error:', error);
      toast.error('Failed to run geographic backfill: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const backfillSingleClient = async (clientId: string) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('backfill-client-geography', {
        body: { clientId }
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      
      toast.success('Client geographic data updated');
      return data;
    } catch (error: any) {
      console.error('Backfill error:', error);
      toast.error('Failed to update client geography: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    runBackfill,
    backfillSingleClient,
    isLoading,
    results
  };
};
