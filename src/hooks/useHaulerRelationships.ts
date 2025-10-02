import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface HaulerRelationship {
  id: string;
  hauler_id: string;
  organization_id: string;
  invited_by?: string;
  invited_at: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

// Get relationships for current organization
export const useHaulerRelationships = (organizationId?: string) => {
  return useQuery({
    queryKey: ["hauler-relationships", organizationId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("hauler_facility_relationships")
        .select(`
          *,
          hauler:haulers(
            id,
            company_name,
            email,
            phone,
            is_approved,
            is_active,
            dot_number,
            license_number
          ),
          invited_by_user:users!hauler_facility_relationships_invited_by_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
};

// Invite hauler (create user, hauler record, and relationship)
export const useInviteHauler = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      first_name,
      last_name,
      company_name,
      organization_id,
      dot_number,
      license_number,
      phone,
      mailing_address,
      city,
      state,
      zip,
    }: {
      email: string;
      first_name: string;
      last_name: string;
      company_name: string;
      organization_id: string;
      dot_number?: string;
      license_number?: string;
      phone?: string;
      mailing_address?: string;
      city?: string;
      state?: string;
      zip?: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: currentUser, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (userError) throw userError;

      // Create user account
      const { data: newUserData, error: createUserError } = await (supabase as any)
        .from("users")
        .insert({
          email,
          first_name,
          last_name,
          phone,
        })
        .select()
        .single();

      if (createUserError) {
        console.error("Error creating user:", createUserError);
        throw new Error(`Failed to create user account: ${createUserError.message}`);
      }

      // Create hauler profile with all required fields
      const { data: hauler, error: haulerError } = await (supabase as any)
        .from("haulers")
        .insert({
          user_id: newUserData.id,
          company_name,
          hauler_name: company_name, // Legacy field
          email,
          phone,
          hauler_phone: phone, // Legacy field
          dot_number,
          license_number,
          mailing_address,
          hauler_mailing_address: mailing_address, // Legacy field
          city,
          hauler_city: city, // Legacy field
          state,
          hauler_state: state, // Legacy field
          zip,
          hauler_zip: zip, // Legacy field
          is_approved: true,
          is_active: true,
        })
        .select()
        .single();

      if (haulerError) {
        console.error("Error creating hauler:", haulerError);
        throw new Error(`Failed to create hauler profile: ${haulerError.message}`);
      }

      // Assign independent_hauler role
      const { error: roleError } = await (supabase as any)
        .from("user_organization_roles")
        .insert({
          user_id: newUserData.id,
          organization_id: organization_id,
          role: "independent_hauler",
        });

      if (roleError) {
        console.error("Error assigning role:", roleError);
        throw new Error(`Failed to assign hauler role: ${roleError.message}`);
      }

      // Create relationship
      const { data: relationship, error: relError } = await (supabase as any)
        .from("hauler_facility_relationships")
        .insert({
          hauler_id: hauler.id,
          organization_id,
          invited_by: currentUser.id,
        })
        .select()
        .single();

      if (relError) {
        console.error("Error creating relationship:", relError);
        throw new Error(`Failed to create hauler relationship: ${relError.message}`);
      }

      return { hauler, relationship };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hauler-relationships"] });
      queryClient.invalidateQueries({ queryKey: ["independent-haulers"] });
      toast.success("Hauler invited successfully");
    },
    onError: (error: any) => {
      console.error("Error inviting hauler:", error);
      const message = error?.message || "Failed to invite hauler. Please try again.";
      toast.error(message);
    },
  });
};

// Update relationship
export const useUpdateRelationship = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: Partial<HaulerRelationship> 
    }) => {
      const { data: relationship, error } = await (supabase as any)
        .from("hauler_facility_relationships")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return relationship;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hauler-relationships"] });
      toast.success("Relationship updated successfully");
    },
    onError: (error) => {
      console.error("Error updating relationship:", error);
      toast.error("Failed to update relationship");
    },
  });
};
