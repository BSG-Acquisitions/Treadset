import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type ClientWorkflow = Database["public"]["Tables"]["client_workflows"]["Row"];
type ClientWorkflowInsert = Database["public"]["Tables"]["client_workflows"]["Insert"];
type ClientWorkflowUpdate = Database["public"]["Tables"]["client_workflows"]["Update"];

export const useClientWorkflows = (clientId?: string) => {
  return useQuery({
    queryKey: ['client-workflows', clientId],
    queryFn: async () => {
      let query = supabase
        .from('client_workflows')
        .select(`
          *,
          clients(company_name, email, phone)
        `);
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      const { data, error } = await query
        .order('next_contact_date', { ascending: true });
        
      if (error) throw error;
      return data || [];
    },
    enabled: clientId ? true : true // Always enabled now
  });
};

export const useActiveFollowups = () => {
  return useQuery({
    queryKey: ['active-followups'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // 1) Fetch workflows first (without join to avoid missing FK issues)
      const { data: workflows, error: wfError } = await supabase
        .from('client_workflows')
        .select('*')
        .eq('status', 'active')
        .eq('workflow_type', 'followup')
        .lte('next_contact_date', today)
        .order('next_contact_date', { ascending: true });

      if (wfError) throw wfError;
      if (!workflows?.length) return [] as any[];

      // 2) Fetch client details in a separate query and merge
      const clientIds = Array.from(new Set(workflows.map(w => w.client_id).filter(Boolean)));
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, company_name, email, last_pickup_at')
        .in('id', clientIds);

      if (clientsError) throw clientsError;

      // 3) Fetch client pickup patterns for smart interval-based filtering
      const { data: patterns } = await supabase
        .from('client_pickup_patterns')
        .select('client_id, average_days_between_pickups, frequency')
        .in('client_id', clientIds);

      // 4) Fetch upcoming scheduled pickups for these clients (next 7 days)
      const { data: upcomingPickups } = await supabase
        .from('pickups')
        .select('client_id, pickup_date')
        .in('client_id', clientIds)
        .eq('status', 'scheduled')
        .gte('pickup_date', today)
        .lte('pickup_date', sevenDaysFromNow);

      // Build sets/maps for quick lookup
      const clientMap = new Map(clients?.map(c => [c.id, c]) ?? []);
      const patternMap = new Map(patterns?.map(p => [p.client_id, p]) ?? []);
      const scheduledClientIds = new Set(upcomingPickups?.map(p => p.client_id) ?? []);
      
      // 5) Smart filter: exclude clients with upcoming scheduled pickups
      // and use client's actual pickup interval to determine if followup is appropriate
      const enriched = workflows
        .map(w => ({
          ...w,
          clients: clientMap.get(w.client_id) || null,
        }))
        .filter(w => {
          // CRITICAL: Skip if client already has a pickup scheduled
          if (scheduledClientIds.has(w.client_id)) {
            return false;
          }
          
          const client = clientMap.get(w.client_id);
          if (!client?.last_pickup_at) return true; // No pickup history, show followup
          
          const lastPickupDate = new Date(client.last_pickup_at);
          const daysSincePickup = Math.floor((Date.now() - lastPickupDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Get client's actual pattern interval (default to 30 days if unknown)
          const pattern = patternMap.get(w.client_id);
          const intervalDays = pattern?.average_days_between_pickups || 30;
          
          // Only show followup if they're at least 75% through their interval
          // e.g., for 11-day interval, show after ~8 days
          const thresholdDays = Math.floor(intervalDays * 0.75);
          
          if (daysSincePickup < thresholdDays) return false; // Too early for followup
          
          return true;
        });

      return enriched;
    }
  });
};

export const useUpdateWorkflow = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ClientWorkflowUpdate }) => {
      const { data, error } = await supabase
        .from('client_workflows')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['active-followups'] });
      toast({ title: "Success", description: "Workflow updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (workflow: ClientWorkflowInsert) => {
      const { data, error } = await supabase
        .from('client_workflows')
        .insert(workflow)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['active-followups'] });
      toast({ title: "Success", description: "Workflow created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};