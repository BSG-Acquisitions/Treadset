import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';
import { SchedulePickupDialog } from '@/components/SchedulePickupDialog';

interface MissingPickupActionsProps {
  clientId: string;
  clientName: string;
  notificationId: string;
  onDismiss: (notificationId: string) => void;
}

export const MissingPickupActions = ({ 
  clientId, 
  clientName, 
  notificationId,
  onDismiss 
}: MissingPickupActionsProps) => {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 mt-2">
      <SchedulePickupDialog
        trigger={
          <Button
            size="sm"
            variant="default"
            className="gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              setScheduleDialogOpen(true);
            }}
          >
            <Calendar className="h-3.5 w-3.5" />
            Schedule Pickup
          </Button>
        }
        defaultClientId={clientId}
      />
      
      <Button
        size="sm"
        variant="ghost"
        className="gap-1.5"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notificationId);
        }}
      >
        <X className="h-3.5 w-3.5" />
        Dismiss
      </Button>
    </div>
  );
};
