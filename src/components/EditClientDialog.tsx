import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClientForm } from "@/components/forms/ClientForm";
import { useUpdateClient } from "@/hooks/useClients";
import { useLocations, useCreateLocation, useUpdateLocation } from "@/hooks/useLocations";
import { useGeocodeLocations } from "@/hooks/useGeocodeLocations";
import { ClientFormData } from "@/lib/validations";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"] & {
  pricing_tier?: { name: string; rate?: number } | null;
};

interface EditClientDialogProps {
  client: Client;
  trigger: React.ReactNode;
}

export function EditClientDialog({ client, trigger }: EditClientDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const updateClient = useUpdateClient();
  const { data: locations = [] } = useLocations(client.id);
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const { geocodeLocation } = useGeocodeLocations();

  const handleSubmit = async (data: ClientFormData & { address?: string; access_notes?: string }) => {
    // Update client with form data (excluding removed fields)
    await updateClient.mutateAsync({
      id: client.id,
      updates: {
        company_name: data.company_name,
        contact_name: data.contact_name || null,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        // Address fields - keep as-is including empty strings
        mailing_address: data.mailing_address === "" ? null : data.mailing_address,
        city: data.city === "" ? null : data.city,
        state: data.state === "" ? null : data.state,
        zip: data.zip === "" ? null : data.zip,
        county: data.county === "" ? null : data.county,
      }
    });

    // Build full address from client fields
    const fullAddress = [
      data.mailing_address,
      data.city,
      [data.state, data.zip].filter(Boolean).join(' ')
    ].filter(Boolean).join(', ');

    // Handle location (address) update or creation - sync with client address
    const primaryLocation = locations[0];
    const hasAddressData = fullAddress && fullAddress.trim().length > 0;
    
    if (hasAddressData) {
      if (primaryLocation) {
        // Update existing location with new address
        await updateLocation.mutateAsync({
          id: primaryLocation.id,
          updates: {
            address: fullAddress,
            access_notes: data.access_notes || null,
          }
        });
        // Re-geocode if address changed
        geocodeLocation(primaryLocation.id, true);
      } else {
        // Create new location from client address data
        const newLocation = await createLocation.mutateAsync({
          client_id: client.id,
          address: fullAddress,
          access_notes: data.access_notes || null,
          name: `${data.company_name} - Primary Location`,
          organization_id: client.organization_id,
        });
        // Geocode the new location
        if (newLocation?.id) {
          geocodeLocation(newLocation.id, true);
        }
      }
    }
    
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>
            Update client information and settings.
          </DialogDescription>
        </DialogHeader>
        <ClientForm
          initialData={client}
          onSubmit={handleSubmit}
          onCancel={() => setIsOpen(false)}
          isLoading={updateClient.isPending || createLocation.isPending || updateLocation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
