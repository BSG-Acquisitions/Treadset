import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RouteEfficiencyData {
  total_distance_miles: number;
  total_duration_minutes: number;
  stops_completed: number;
  average_time_per_stop_minutes: number;
  efficiency_score: number;
}

export function useRouteEfficiency() {
  const [isLoading, setIsLoading] = useState(false);

  const getEfficiency = useCallback(async (assignmentId: string): Promise<RouteEfficiencyData | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('calculate-route-efficiency', {
        body: { assignment_id: assignmentId },
      });

      if (error) {
        console.error('Route efficiency error:', error);
        return null;
      }

      return data as RouteEfficiencyData;
    } catch (err) {
      console.error('Failed to get route efficiency:', err);
      return null;
    }
  }, []);

  const getMultipleEfficiencies = useCallback(async (assignmentIds: string[]): Promise<Record<string, RouteEfficiencyData>> => {
    setIsLoading(true);
    const results: Record<string, RouteEfficiencyData> = {};

    try {
      const promises = assignmentIds.map(async (id) => {
        const data = await getEfficiency(id);
        if (data) results[id] = data;
      });

      await Promise.all(promises);
    } finally {
      setIsLoading(false);
    }

    return results;
  }, [getEfficiency]);

  return { getEfficiency, getMultipleEfficiencies, isLoading };
}
