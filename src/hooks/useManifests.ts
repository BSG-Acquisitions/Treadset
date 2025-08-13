import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Manifest {
  id: string;
  organization_id: string;
  manifest_number: string;
  client_id: string;
  location_id?: string;
  pickup_id?: string;
  driver_id?: string;
  vehicle_id?: string;
  created_at: string;
  updated_at: string;
  signed_at?: string;
  signed_by_name?: string;
  signed_by_title?: string;
  signed_by_email?: string;
  sign_ip?: string;
  
  // Tire counts
  pte_off_rim: number;
  pte_on_rim: number;
  commercial_17_5_19_5_off: number;
  commercial_17_5_19_5_on: number;
  commercial_22_5_off: number;
  commercial_22_5_on: number;
  otr_count: number;
  tractor_count: number;
  
  // Additional measurements
  weight_tons?: number;
  volume_yards?: number;
  
  // File paths
  photos?: string[];
  customer_signature_png_path?: string;
  driver_signature_png_path?: string;
  pdf_path?: string;
  pdf_bytes_hash?: string;
  
  // Payment information
  payment_method: 'CARD' | 'INVOICE' | 'CASH' | 'CHECK';
  payment_status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'NOT_APPLICABLE';
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  paid_amount: number;
  receipt_url?: string;
  
  // Pricing information
  resolved_unit_prices?: any;
  subtotal: number;
  surcharges: number;
  total: number;
  
  // Status
  status: 'DRAFT' | 'IN_PROGRESS' | 'AWAITING_SIGNATURE' | 'AWAITING_PAYMENT' | 'COMPLETED';
  
  // Relations
  client?: {
    id: string;
    company_name: string;
  };
  location?: {
    id: string;
    name: string;
    address: string;
  };
  pickup?: {
    id: string;
    pickup_date: string;
  };
}

export interface CreateManifestData {
  client_id: string;
  location_id?: string;
  pickup_id?: string;
  driver_id?: string;
  vehicle_id?: string;
  pte_off_rim?: number;
  pte_on_rim?: number;
  commercial_17_5_19_5_off?: number;
  commercial_17_5_19_5_on?: number;
  commercial_22_5_off?: number;
  commercial_22_5_on?: number;
  otr_count?: number;
  tractor_count?: number;
  weight_tons?: number;
  volume_yards?: number;
  payment_method?: 'CARD' | 'INVOICE' | 'CASH' | 'CHECK';
}

export interface UpdateManifestData {
  id: string;
  signed_by_name?: string;
  signed_by_title?: string;
  signed_by_email?: string;
  customer_signature_png_path?: string;
  driver_signature_png_path?: string;
  pdf_path?: string;
  payment_status?: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'NOT_APPLICABLE';
  stripe_payment_intent_id?: string;
  paid_amount?: number;
  receipt_url?: string;
  status?: 'DRAFT' | 'IN_PROGRESS' | 'AWAITING_SIGNATURE' | 'AWAITING_PAYMENT' | 'COMPLETED';
  photos?: string[];
}

export const useManifests = (clientId?: string, driverId?: string) => {
  return useQuery({
    queryKey: ['manifests', { clientId, driverId }],
    queryFn: async () => {
      let query = supabase
        .from('manifests')
        .select(`
          *,
          client:clients(id, company_name),
          location:locations(id, name, address),
          pickup:pickups(id, pickup_date)
        `)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (driverId) {
        query = query.eq('driver_id', driverId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as unknown as Manifest[];
    },
  });
};

export const useManifest = (id: string) => {
  return useQuery({
    queryKey: ['manifest', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manifests')
        .select(`
          *,
          client:clients(id, company_name),
          location:locations(id, name, address),
          pickup:pickups(id, pickup_date)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as Manifest;
    },
    enabled: !!id,
  });
};

export const useCreateManifest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateManifestData) => {
      // Generate manifest number
      const { data: manifestNumber, error: numberError } = await supabase
        .rpc('generate_manifest_number', { 
          org_id: (await supabase.rpc('get_current_user_organization')).data 
        });

      if (numberError) throw numberError;

      const manifestData = {
        ...data,
        manifest_number: manifestNumber,
        organization_id: (await supabase.rpc('get_current_user_organization')).data,
        status: 'DRAFT' as const,
      };

      const { data: manifest, error } = await supabase
        .from('manifests')
        .insert(manifestData)
        .select()
        .single();

      if (error) throw error;
      return manifest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      toast({ 
        title: "Manifest Created", 
        description: "Digital manifest has been created successfully" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });
};

export const useUpdateManifest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateManifestData) => {
      const updates = {
        ...data,
        updated_at: new Date().toISOString()
      };

      // Set signed_at when completing signatures
      if (data.status === 'AWAITING_PAYMENT' && data.customer_signature_png_path) {
        (updates as any).signed_at = new Date().toISOString();
      }

      const { data: manifest, error } = await supabase
        .from('manifests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return manifest;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      queryClient.invalidateQueries({ queryKey: ['manifest', variables.id] });
      
      if (variables.status === 'COMPLETED') {
        toast({ 
          title: "Manifest Completed", 
          description: "Digital manifest has been completed successfully" 
        });
      }
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });
};