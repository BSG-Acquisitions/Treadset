import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IndependentHauler {
  id: string;
  user_id: string;
  company_name: string;
  dot_number?: string;
  license_number?: string;
  dot_document_path?: string;
  license_document_path?: string;
  is_approved: boolean;
  is_active: boolean;
  phone?: string;
  email: string;
  mailing_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateHaulerData {
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
  dot_number?: string;
  license_number?: string;
  phone?: string;
  mailing_address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

// Get all haulers for a facility
export const useIndependentHaulers = () => {
  return useQuery({
    queryKey: ["independent-haulers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("haulers")
        .select(`
          *,
          user:users!haulers_user_id_fkey(id, email, first_name, last_name),
          relationships:hauler_facility_relationships(
            id,
            organization_id,
            is_active,
            notes,
            invited_at
          )
        `)
        .eq("is_active", true)
        .order("company_name");

      if (error) throw error;
      return data as any[];
    },
  });
};

// Get hauler profile for current user
export const useHaulerProfile = () => {
  return useQuery({
    queryKey: ["hauler-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (userError) throw userError;

      const { data, error } = await (supabase as any)
        .from("haulers")
        .select(`
          *,
          relationships:hauler_facility_relationships(
            id,
            organization_id,
            is_active,
            notes,
            invited_at,
            organization:organizations(id, name, slug)
          )
        `)
        .eq("user_id", userData.id)
        .single();

      if (error) throw error;
      
      // Extract organization_id from first active relationship
      const activeRelationship = data?.relationships?.find((r: any) => r.is_active);
      const organizationId = activeRelationship?.organization_id;
      
      return {
        ...data,
        organization_id: organizationId,
        organization: activeRelationship?.organization,
      };
    },
  });
};

// Update hauler profile
export const useUpdateHauler = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<IndependentHauler> }) => {
      const { data: hauler, error } = await (supabase as any)
        .from("haulers")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return hauler;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["independent-haulers"] });
      queryClient.invalidateQueries({ queryKey: ["hauler-profile"] });
      toast.success("Hauler updated successfully");
    },
    onError: (error) => {
      console.error("Error updating hauler:", error);
      toast.error("Failed to update hauler");
    },
  });
};

// Upload document
export const useUploadHaulerDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      haulerId, 
      file, 
      type 
    }: { 
      haulerId: string; 
      file: File; 
      type: 'dot' | 'license' 
    }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${haulerId}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `hauler-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('manifests')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const field = type === 'dot' ? 'dot_document_path' : 'license_document_path';
      const { error: updateError } = await (supabase as any)
        .from('haulers')
        .update({ [field]: filePath })
        .eq('id', haulerId);

      if (updateError) throw updateError;

      return filePath;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["independent-haulers"] });
      queryClient.invalidateQueries({ queryKey: ["hauler-profile"] });
      toast.success("Document uploaded successfully");
    },
    onError: (error) => {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    },
  });
};
