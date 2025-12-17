import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClientForm } from "@/components/forms/ClientForm";
import { useCreateClient } from "@/hooks/useClients";
import { useCreateLocation } from "@/hooks/useLocations";
import { useGeocodeLocations } from "@/hooks/useGeocodeLocations";
import { ClientFormData } from "@/lib/validations";
import { useToast } from "@/hooks/use-toast";

interface CreateClientDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateClientDialog({ trigger, open: controlledOpen, onOpenChange }: CreateClientDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const createClient = useCreateClient();
  const createLocation = useCreateLocation();
  const { geocodeLocation } = useGeocodeLocations();
  const { toast } = useToast();

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const handleSubmit = async (data: ClientFormData) => {
    try {
      const clientData = {
        company_name: data.company_name,
        contact_name: data.contact_name || null,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        mailing_address: data.mailing_address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        county: data.county || null,
        organization_id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73', // Default org ID
      };

      const client = await createClient.mutateAsync(clientData);

      // Create primary location if address provided and trigger geocoding
      if (data.mailing_address && data.mailing_address.trim()) {
        const fullAddress = [
          data.mailing_address,
          data.city,
          [data.state, data.zip].filter(Boolean).join(' ')
        ].filter(Boolean).join(', ');

        const location = await createLocation.mutateAsync({
          client_id: client.id,
          name: `${data.company_name} - Primary Location`,
          address: fullAddress,
          access_notes: null,
          pricing_tier_id: null,
          is_active: true,
          organization_id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73',
        });

        // Trigger geocoding for the new location
        if (location?.id) {
          geocodeLocation(location.id, true);
        }
      }

      toast({
        title: "Success",
        description: `Client "${data.company_name}" has been created successfully.`,
      });

      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create client",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        <ClientForm
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
          isLoading={createClient.isPending || createLocation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
