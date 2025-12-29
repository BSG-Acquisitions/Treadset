import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface PortalInvite {
  id: string;
  client_id: string;
  organization_id: string;
  token: string;
  sent_to_email: string | null;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  reminder_count: number | null;
  client?: {
    id: string;
    company_name: string;
    email: string | null;
  };
}

export interface PortalInviteStats {
  totalClientsWithEmail: number;
  alreadyInvited: number;
  notYetInvited: number;
  signedUp: number;
  optedOut: number;
  opened: number;
  clicked: number;
}

export function usePortalInvites() {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ["portal-invites", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_invites")
        .select(`
          *,
          client:clients(id, company_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PortalInvite[];
    },
    enabled: !!orgId,
  });
}

export function usePortalInviteStats() {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ["portal-invite-stats", orgId],
    queryFn: async () => {
      // Get total clients with email
      const { count: totalWithEmail } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .not("email", "is", null)
        .neq("email", "");

      // Get unique clients who have been invited
      const { data: invitedClients } = await supabase
        .from("client_invites")
        .select("client_id");
      
      const uniqueInvitedClientIds = new Set(invitedClients?.map(i => i.client_id) || []);
      const alreadyInvited = uniqueInvitedClientIds.size;

      // Get clients who signed up (used the invite)
      const { count: signedUp } = await supabase
        .from("client_invites")
        .select("*", { count: "exact", head: true })
        .not("used_at", "is", null);

      // Get opted out count
      const { count: optedOut } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("portal_invite_opted_out", true);

      // Get opened count (unique invites that were opened)
      const { count: opened } = await supabase
        .from("client_invites")
        .select("*", { count: "exact", head: true })
        .not("opened_at", "is", null);

      // Get clicked count (unique invites that were clicked)
      const { count: clicked } = await supabase
        .from("client_invites")
        .select("*", { count: "exact", head: true })
        .not("clicked_at", "is", null);

      return {
        totalClientsWithEmail: totalWithEmail || 0,
        alreadyInvited,
        notYetInvited: (totalWithEmail || 0) - alreadyInvited,
        signedUp: signedUp || 0,
        optedOut: optedOut || 0,
        opened: opened || 0,
        clicked: clicked || 0,
      } as PortalInviteStats;
    },
    enabled: !!orgId,
  });
}

export function useClientInviteStatus(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-invite-status", clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from("client_invites")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useSendPortalInvite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (clientIds: string[]) => {
      const { data, error } = await supabase.functions.invoke("send-portal-invitation", {
        body: { client_ids: clientIds },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["portal-invites"] });
      queryClient.invalidateQueries({ queryKey: ["portal-invite-stats"] });
      queryClient.invalidateQueries({ queryKey: ["client-invite-status"] });
      
      toast({
        title: "Portal invite sent",
        description: data.summary || "Invitation sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invite",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });
}

export function useSendBulkPortalInvites() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      // Get all active clients with email who haven't been invited yet
      const { data: allClients } = await supabase
        .from("clients")
        .select("id, email")
        .eq("is_active", true)
        .eq("portal_invite_opted_out", false)
        .not("email", "is", null)
        .neq("email", "");

      // Get already invited client IDs
      const { data: invites } = await supabase
        .from("client_invites")
        .select("client_id");

      const invitedSet = new Set(invites?.map(i => i.client_id) || []);
      
      // Filter to only uninvited clients
      const uninvitedClientIds = allClients
        ?.filter(c => !invitedSet.has(c.id))
        .map(c => c.id) || [];

      if (uninvitedClientIds.length === 0) {
        throw new Error("No uninvited clients found");
      }

      // Send in batches of 50 to avoid timeouts
      const batchSize = 50;
      const results = [];
      
      for (let i = 0; i < uninvitedClientIds.length; i += batchSize) {
        const batch = uninvitedClientIds.slice(i, i + batchSize);
        const { data, error } = await supabase.functions.invoke("send-portal-invitation", {
          body: { client_ids: batch },
        });
        
        if (error) throw error;
        results.push(data);
      }

      return {
        totalSent: uninvitedClientIds.length,
        results,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["portal-invites"] });
      queryClient.invalidateQueries({ queryKey: ["portal-invite-stats"] });
      
      toast({
        title: "Bulk invites sent",
        description: `Sent ${data.totalSent} portal invitations`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send bulk invites",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });
}

interface ReminderResult {
  success: boolean;
  summary: string;
  stats: {
    total: number;
    sent: number;
    skipped: number;
    errors: number;
    day7_sent: number;
    day14_sent: number;
  };
}

export function useSendInviteReminders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useMutation({
    mutationFn: async (dryRun: boolean = false): Promise<ReminderResult> => {
      const { data, error } = await supabase.functions.invoke("send-invite-reminders", {
        body: { 
          organization_id: orgId,
          dry_run: dryRun 
        },
      });

      if (error) throw error;
      return data as ReminderResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["portal-invites"] });
      queryClient.invalidateQueries({ queryKey: ["portal-invite-stats"] });
      
      if (data.stats.sent > 0) {
        toast({
          title: "Reminders sent",
          description: data.summary,
        });
      } else {
        toast({
          title: "No reminders needed",
          description: "No clients are due for a reminder right now",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send reminders",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });
}
