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
          clients(company_name, email)
        `);
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      const { data, error } = await query
        .order('next_contact_date', { ascending: true });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId
  });
};

export const useActiveFollowups = () => {
  return useQuery({
    queryKey: ['active-followups'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

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
        .select('id, company_name, email')
        .in('id', clientIds);

      if (clientsError) throw clientsError;

      const clientMap = new Map(clients?.map(c => [c.id, c]) ?? []);
      const enriched = workflows.map(w => ({
        ...w,
        clients: clientMap.get(w.client_id) || null,
      }));

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