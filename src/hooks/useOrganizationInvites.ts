import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface OrganizationInvite {
  id: string;
  organization_id: string;
  email: string | null;
  role: string;
  token: string;
  invite_type: "email" | "qr_code";
  personal_message: string | null;
  expires_at: string;
  created_by: string | null;
  sent_at: string | null;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
}

export function useOrganizationInvites() {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ["organization-invites", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from("organization_invites")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OrganizationInvite[];
    },
    enabled: !!orgId,
  });
}

export function useSendEmailInvite() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      role,
      personal_message,
    }: {
      email: string;
      role: string;
      personal_message?: string;
    }) => {
      const orgId = user?.currentOrganization?.id;
      if (!orgId) throw new Error("No organization selected");

      const inviterName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.email;

      const { data, error } = await supabase.functions.invoke("send-team-invite", {
        body: {
          email,
          role,
          organization_id: orgId,
          personal_message,
          inviter_name: inviterName,
          inviter_email: user?.email,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-invites"] });
      toast({
        title: "Invitation Sent",
        description: "The team member has been sent an email invitation.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Invitation",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useCreateQRInvite() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ role }: { role: string }) => {
      const orgId = user?.currentOrganization?.id;
      if (!orgId) throw new Error("No organization selected");

      // Get current user's internal ID
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data, error } = await supabase
        .from("organization_invites")
        .insert({
          organization_id: orgId,
          role: role as any,
          invite_type: "qr_code",
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          created_by: userData?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-invites"] });
      toast({
        title: "QR Code Created",
        description: "The invite QR code has been generated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create QR Code",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useResendInvite() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invite: OrganizationInvite) => {
      if (!invite.email) throw new Error("Cannot resend QR code invites");

      const inviterName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.email;

      const { data, error } = await supabase.functions.invoke("send-team-invite", {
        body: {
          email: invite.email,
          role: invite.role,
          organization_id: invite.organization_id,
          personal_message: invite.personal_message,
          inviter_name: inviterName,
          inviter_email: user?.email,
        },
      });

      if (error) throw error;

      // Update the sent_at timestamp
      await supabase
        .from("organization_invites")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", invite.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-invites"] });
      toast({
        title: "Invitation Resent",
        description: "The invitation email has been sent again.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Resend",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useCancelInvite() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("organization_invites")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-invites"] });
      toast({
        title: "Invitation Cancelled",
        description: "The invitation has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Cancel",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useValidateInviteToken(token: string | undefined) {
  return useQuery({
    queryKey: ["invite-validation", token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase.rpc("validate_invite_token", {
        invite_token: token,
      });

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!token,
    staleTime: 60000,
  });
}
