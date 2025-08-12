import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  route_updates: boolean;
  client_alerts: boolean;
  system_maintenance: boolean;
  dark_mode: boolean;
  reduced_motion: boolean;
  compact_layout: boolean;
  two_factor_enabled: boolean;
  session_timeout: boolean;
  activity_logging: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesData {
  email_notifications?: boolean;
  route_updates?: boolean;
  client_alerts?: boolean;
  system_maintenance?: boolean;
  dark_mode?: boolean;
  reduced_motion?: boolean;
  compact_layout?: boolean;
  two_factor_enabled?: boolean;
  session_timeout?: boolean;
  activity_logging?: boolean;
}

export function useUserPreferences() {
  return useQuery({
    queryKey: ["user-preferences"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("User not authenticated");

      // Use the database function to get or create preferences
      const { data, error } = await supabase
        .rpc('get_or_create_user_preferences', { target_user_id: user.user.id })
        .single();

      if (error) throw error;
      return data as UserPreferences;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: UpdatePreferencesData) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("user_preferences")
        .update(updates)
        .eq("user_id", user.user.id)
        .select()
        .single();

      if (error) throw error;

      // Apply dark mode immediately
      if (updates.dark_mode !== undefined) {
        document.documentElement.classList.toggle("dark", updates.dark_mode);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating preferences:", error);
      toast({
        title: "Error updating settings",
        description: "There was a problem saving your preferences. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateUserProfile() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: { email?: string; phone?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("User not authenticated");

      // Update auth user metadata
      const { data, error } = await supabase.auth.updateUser({
        email: updates.email,
        data: {
          phone: updates.phone,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      toast({
        title: "Error updating profile",
        description: "There was a problem saving your profile. Please try again.",
        variant: "destructive",
      });
    },
  });
}