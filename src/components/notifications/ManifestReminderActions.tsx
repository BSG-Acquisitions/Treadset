import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useManifestReminders } from '@/hooks/useManifestReminders';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink, CheckCircle, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ManifestReminderActionsProps {
  manifestId: string;
  manifestNumber: string;
  onActionComplete?: () => void;
}

export const ManifestReminderActions = ({
  manifestId,
  manifestNumber,
  onActionComplete,
}: ManifestReminderActionsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { markManifestComplete, assignFollowUp } = useManifestReminders();
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Get organization users for follow-up assignment
  const { data: orgUsers } = useQuery({
    queryKey: ['org-users-for-followup'],
    queryFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return [];

      const { data: orgData } = await supabase
        .from('user_organization_roles')
        .select('organization_id')
        .eq('user_id', userData.id)
        .single();

      if (!orgData) return [];

      const { data, error } = await supabase
        .from('user_organization_roles')
        .select(`
          user_id,
          role,
          users(id, first_name, last_name, email)
        `)
        .eq('organization_id', orgData.organization_id)
        .in('role', ['admin', 'ops_manager', 'dispatcher', 'receptionist']);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && showFollowUpDialog,
  });

  const handleOpenManifest = () => {
    navigate('/manifests');
    onActionComplete?.();
  };

  const handleMarkComplete = () => {
    markManifestComplete(manifestId);
    onActionComplete?.();
  };

  const handleAssignFollowUp = () => {
    if (!selectedUserId) return;
    assignFollowUp({ manifestId, userId: selectedUserId });
    setShowFollowUpDialog(false);
    onActionComplete?.();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={handleOpenManifest}
        >
          <ExternalLink className="h-3 w-3" />
          Open Manifest
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={handleMarkComplete}
        >
          <CheckCircle className="h-3 w-3" />
          Mark Complete
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => setShowFollowUpDialog(true)}
        >
          <UserPlus className="h-3 w-3" />
          Assign Follow-Up
        </Button>
      </div>

      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Follow-Up</DialogTitle>
            <DialogDescription>
              Assign someone to follow up on manifest {manifestNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {orgUsers?.map((orgUser) => (
                  <SelectItem key={orgUser.user_id} value={orgUser.user_id}>
                    {orgUser.users?.first_name} {orgUser.users?.last_name} ({orgUser.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowUpDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignFollowUp} disabled={!selectedUserId}>
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
