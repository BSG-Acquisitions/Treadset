import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
type InvoiceItem = Database["public"]["Tables"]["invoice_items"]["Row"];
type Payment = Database["public"]["Tables"]["payments"]["Row"];
type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];

export const useInvoices = (clientId?: string) => {
  return useQuery({
    queryKey: ['invoices', clientId],
    queryFn: async () => {
      let query = supabase.from('invoices')
        .select(`
          *,
          client:clients(company_name, contact_name),
          invoice_items(
            *,
            pickup:pickups(pickup_date, pte_count, otr_count, tractor_count)
          ),
          payments(amount, payment_date, payment_method)
        `);
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });
};

export const useCompletedPickups = (clientId?: string) => {
  return useQuery({
    queryKey: ['completed-pickups', clientId],
    queryFn: async () => {
      let query = supabase.from('pickups')
        .select(`
          *,
          client:clients(company_name),
          location:locations(address),
          invoice_items(invoice_id)
        `)
        .eq('status', 'completed');
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      const { data, error } = await query.order('pickup_date', { ascending: false });
      if (error) throw error;
      
      // Filter out pickups that are already invoiced
      return (data || []).filter(pickup => 
        !pickup.invoice_items || pickup.invoice_items.length === 0
      );
    }
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      clientId: string;
      pickupIds: string[];
      dueDate: string;
      notes?: string;
    }) => {
      const organizationId = user?.currentOrganization?.id;
      if (!organizationId) {
        throw new Error("Your account is not assigned to an organization. Contact your admin.");
      }

      // Get organization settings for tax rate
      const { data: orgSettings } = await supabase
        .from('organization_settings')
        .select('tax_rate')
        .limit(1)
        .single();

      const taxRate = orgSettings?.tax_rate || 0.0825;

      // Generate invoice number
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number');

      if (numberError) throw numberError;

      // Get pickup details with computed revenue
      const { data: pickups, error: pickupsError } = await supabase
        .from('pickups')
        .select('*, location:locations(address)')
        .in('id', data.pickupIds);

      if (pickupsError) throw pickupsError;

      // Calculate subtotal
      const subtotal = pickups.reduce((sum, pickup) => sum + (pickup.computed_revenue || 0), 0);
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          client_id: data.clientId,
          organization_id: organizationId,
          invoice_number: invoiceNumber,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: 'draft',
          issued_date: new Date().toISOString().split('T')[0],
          due_date: data.dueDate,
          notes: data.notes
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = pickups.map(pickup => ({
        invoice_id: invoice.id,
        pickup_id: pickup.id,
        description: `Tire pickup at ${pickup.location?.address} - PTE: ${pickup.pte_count}, OTR: ${pickup.otr_count}, Tractor: ${pickup.tractor_count}`,
        quantity: 1,
        unit_price: pickup.computed_revenue || 0,
        total_price: pickup.computed_revenue || 0
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update client open balance
      const { error: balanceError } = await supabase
        .from('clients')
        .update({ 
          open_balance: totalAmount
        })
        .eq('id', data.clientId);

      if (balanceError) throw balanceError;

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['completed-pickups'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: "Success", description: "Invoice created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payment: Omit<PaymentInsert, 'organization_id'>) => {
      const organizationId = user?.currentOrganization?.id;
      if (!organizationId) {
        throw new Error("Your account is not assigned to an organization. Contact your admin.");
      }
      const { data, error } = await supabase
        .from('payments')
        .insert({ ...payment, organization_id: organizationId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: "Success", description: "Payment recorded successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};

export const useCompletePickup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (pickupId: string) => {
      const { data, error } = await supabase
        .from('pickups')
        .update({ status: 'completed' })
        .eq('id', pickupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({ title: "Success", description: "Pickup marked as completed" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
};