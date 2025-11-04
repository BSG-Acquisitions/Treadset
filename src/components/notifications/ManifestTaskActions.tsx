import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useManifestTasks } from '@/hooks/useManifestTasks';

interface ManifestTaskActionsProps {
  taskId: string;
  manifestId: string;
  manifestNumber: string;
}

export const ManifestTaskActions = ({
  taskId,
  manifestId,
  manifestNumber,
}: ManifestTaskActionsProps) => {
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const { openManifest, resolveTask, isResolving } = useManifestTasks();

  const handleOpenManifest = () => {
    openManifest(manifestId);
  };

  const handleResolve = () => {
    resolveTask(
      { taskId, notes: resolutionNotes },
      {
        onSuccess: () => {
          setResolveDialogOpen(false);
          setResolutionNotes('');
        },
      }
    );
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenManifest}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Open Manifest
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => setResolveDialogOpen(true)}
          className="gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Mark Resolved
        </Button>
      </div>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Manifest Task</DialogTitle>
            <DialogDescription>
              Mark manifest {manifestNumber} as resolved. Add notes about the resolution if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Resolution Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="What was done to resolve this?"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveDialogOpen(false)}
              disabled={isResolving}
            >
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={isResolving}>
              {isResolving ? 'Resolving...' : 'Mark Resolved'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
