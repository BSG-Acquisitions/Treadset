import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RecordMetricParams {
  metricName: string;
  metricValue: number;
  metricUnit?: string;
  metadata?: Record<string, any>;
}

/**
 * Hook to record performance metrics
 */
export function useRecordMetric() {
  const { user } = useAuth();

  const recordMetric = async ({
    metricName,
    metricValue,
    metricUnit = 'ms',
    metadata = {},
  }: RecordMetricParams) => {
    try {
      // Get organization ID from user
      const { data: userOrg } = await supabase
        .from('user_organization_roles')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (!userOrg) {
        console.warn('[METRICS] No organization found for user');
        return;
      }

      // Call edge function to record metric
      const { data, error } = await supabase.functions.invoke('record-performance-metric', {
        body: {
          organizationId: userOrg.organization_id,
          metricName,
          metricValue,
          metricUnit,
          metadata,
        },
      });

      if (error) {
        console.error('[METRICS] Error recording metric:', error);
        return;
      }

      console.log(`[METRICS] Recorded: ${metricName} = ${metricValue}${metricUnit}`);
      return data;
    } catch (error) {
      console.error('[METRICS] Failed to record metric:', error);
    }
  };

  return { recordMetric };
}
