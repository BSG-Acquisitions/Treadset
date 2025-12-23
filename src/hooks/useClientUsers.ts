import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ClientUserRole = 'primary' | 'billing' | 'viewer';

export interface ClientUser {
  id: string;
  client_id: string;
  user_id: string;
  organization_id: string;
  role: ClientUserRole;
  invited_by: string | null;
  created_at: string;
  user?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export interface ClientUserInvite {
  id: string;
  client_id: string;
  organization_id: string;
  invited_email: string;
  role: ClientUserRole;
  invited_by: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

// Get the current user's role for a specific client
export function useClientUserRole(clientId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['client-user-role', clientId, user?.id],
    queryFn: async () => {
      if (!clientId || !user?.id) return null;
      
      const { data, error } = await supabase
        .from('client_users')
        .select('role')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching client user role:', error);
        return null;
      }
      
      return data?.role as ClientUserRole | null;
    },
    enabled: !!clientId && !!user?.id,
  });
}

// Get all users for a client (for primary contacts to manage)
export function useClientUsers(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-users', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('client_users')
        .select(`
          id,
          client_id,
          user_id,
          organization_id,
          role,
          invited_by,
          created_at
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching client users:', error);
        throw error;
      }
      
      // Fetch user details separately to avoid join ambiguity
      const userIds = data.map(cu => cu.user_id);
      const { data: users } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .in('id', userIds);
      
      const usersMap = new Map(users?.map(u => [u.id, u]) || []);
      
      return data.map(cu => ({
        ...cu,
        user: usersMap.get(cu.user_id) || null
      })) as ClientUser[];
    },
    enabled: !!clientId,
  });
}

// Get pending invites for a client
export function useClientUserInvites(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-user-invites', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('client_user_invites')
        .select('*')
        .eq('client_id', clientId)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching client user invites:', error);
        throw error;
      }
      
      return data as ClientUserInvite[];
    },
    enabled: !!clientId,
  });
}

// Send a team member invite
export function useSendClientTeamInvite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      clientId, 
      email, 
      role 
    }: { 
      clientId: string; 
      email: string; 
      role: ClientUserRole;
    }) => {
      // Get client and organization info
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, company_name, organization_id')
        .eq('id', clientId)
        .single();
      
      if (clientError || !client) {
        throw new Error('Client not found');
      }
      
      // Create the invite
      const { data: invite, error: inviteError } = await supabase
        .from('client_user_invites')
        .insert({
          client_id: clientId,
          organization_id: client.organization_id,
          invited_email: email,
          role: role,
          invited_by: user?.id,
        })
        .select('id, token')
        .single();
      
      if (inviteError) {
        console.error('Error creating invite:', inviteError);
        throw new Error('Failed to create invitation');
      }
      
      // Send the email via edge function
      const { error: sendError } = await supabase.functions.invoke('send-client-team-invite', {
        body: { invite_id: invite.id }
      });
      
      if (sendError) {
        console.error('Error sending invite email:', sendError);
        // Don't throw - invite is created, just email failed
        toast.warning('Invitation created but email failed to send. Copy the link manually.');
      }
      
      return invite;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-user-invites', variables.clientId] });
      toast.success('Invitation sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });
}

// Remove a team member
export function useRemoveClientUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ clientUserId, clientId }: { clientUserId: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_users')
        .delete()
        .eq('id', clientUserId);
      
      if (error) {
        console.error('Error removing client user:', error);
        throw new Error('Failed to remove team member');
      }
      
      return { clientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-users', data.clientId] });
      toast.success('Team member removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove team member');
    },
  });
}

// Cancel a pending invite
export function useCancelClientUserInvite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ inviteId, clientId }: { inviteId: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_user_invites')
        .delete()
        .eq('id', inviteId);
      
      if (error) {
        console.error('Error canceling invite:', error);
        throw new Error('Failed to cancel invitation');
      }
      
      return { clientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-user-invites', data.clientId] });
      toast.success('Invitation cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel invitation');
    },
  });
}
