import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import { DriverManifestCreationWizard } from "./driver/DriverManifestCreationWizard";

interface CompletePickupDialogProps {
  pickup: {
    id: string;
    client?: { 
      id?: string;
      company_name: string;
      contact_name?: string;
      email?: string;
      phone?: string;
      mailing_address?: string;
      city?: string;
      state?: string;
      zip?: string;
      county?: string;
      physical_address?: string;
      physical_city?: string;
      physical_state?: string;
      physical_zip?: string;
    };
    location?: { 
      id?: string;
      name?: string; 
      address: string; 
    };
    pickup_date: string;
    pte_count: number;
    otr_count: number;
    tractor_count: number;
    notes?: string;
    status: string;
  };
  trigger: React.ReactNode;
  onSuccess?: (manifestId: string, pdfPath?: string) => void;
}

export function CompletePickupDialog({ pickup, trigger, onSuccess }: CompletePickupDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleComplete = () => {
    setOpen(false);
    toast({
      title: "Success",
      description: "Manifest created successfully",
    });
    if (onSuccess) {
      onSuccess("", "");
    }
  };

  // Reset when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto" hideClose>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-brand-success flex-shrink-0" />
            <span className="truncate">Complete Pickup & Generate Manifest</span>
          </DialogTitle>
        </DialogHeader>

        <DriverManifestCreationWizard
          pickupId={pickup.id}
          clientId={pickup.client?.id}
          onComplete={handleComplete}
        />
      </DialogContent>
    </Dialog>
  );
}
