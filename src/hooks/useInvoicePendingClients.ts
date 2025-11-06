import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface InvoicePendingClient {
  client_id: string;
  client_name: string;
  pending_manifest_count: number;
  total_pending_amount: number;
  oldest_pending_date: string;
  latest_pending_date: string;
}

export const useInvoicePendingClients = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invoice-pending-clients', user?.currentOrganization?.id],
    queryFn: async () => {
      if (!user?.currentOrganization?.id) return [];

      // Get TODAY's date in YYYY-MM-DD format
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      // Get only TODAY's manifests with INVOICE payment method and PENDING status
      const { data, error } = await supabase
        .from('manifests')
        .select(`
          id,
          client_id,
          total,
          created_at,
          payment_method,
          payment_status,
          clients!inner(
            id,
            company_name
          )
        `)
        .eq('organization_id', user.currentOrganization.id)
        .eq('payment_method', 'INVOICE')
        .eq('payment_status', 'PENDING')
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching invoice pending clients:', error);
        throw error;
      }

      // Group by client
      const clientMap = new Map<string, InvoicePendingClient>();
      
      data?.forEach((manifest: any) => {
        const clientId = manifest.client_id;
        const clientName = manifest.clients?.company_name || 'Unknown Client';
        
        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            client_id: clientId,
            client_name: clientName,
            pending_manifest_count: 0,
            total_pending_amount: 0,
            oldest_pending_date: manifest.created_at,
            latest_pending_date: manifest.created_at
          });
        }

        const client = clientMap.get(clientId)!;
        client.pending_manifest_count += 1;
        client.total_pending_amount += manifest.total || 0;
        
        // Update date range
        if (new Date(manifest.created_at) < new Date(client.oldest_pending_date)) {
          client.oldest_pending_date = manifest.created_at;
        }
        if (new Date(manifest.created_at) > new Date(client.latest_pending_date)) {
          client.latest_pending_date = manifest.created_at;
        }
      });

      return Array.from(clientMap.values()).sort((a, b) => 
        new Date(a.oldest_pending_date).getTime() - new Date(b.oldest_pending_date).getTime()
      );
    },
    enabled: !!user?.currentOrganization?.id,
    refetchInterval: 60000, // Refresh every minute
  });
};
