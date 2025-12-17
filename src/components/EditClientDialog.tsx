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
    // Trim all text fields to prevent whitespace issues
    const trimmedData = {
      company_name: data.company_name.trim(),
      contact_name: data.contact_name?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      notes: data.notes?.trim() || null,
      mailing_address: data.mailing_address?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      zip: data.zip?.trim() || null,
      county: data.county?.trim() || null,
      access_notes: data.access_notes?.trim() || null,
    };

    // Update client with form data
    await updateClient.mutateAsync({
      id: client.id,
      updates: {
        company_name: trimmedData.company_name,
        contact_name: trimmedData.contact_name,
        email: trimmedData.email,
        phone: trimmedData.phone,
        notes: trimmedData.notes,
        mailing_address: trimmedData.mailing_address,
        city: trimmedData.city,
        state: trimmedData.state,
        zip: trimmedData.zip,
        county: trimmedData.county,
      }
    });

    // Build full address from trimmed client fields
    const fullAddress = [
      trimmedData.mailing_address,
      trimmedData.city,
      [trimmedData.state, trimmedData.zip].filter(Boolean).join(' ')
    ].filter(Boolean).join(', ');

    // Handle location (address) update or creation - sync with client address
    const primaryLocation = locations[0];
    const hasAddressData = fullAddress && fullAddress.length > 0;
    
    if (hasAddressData) {
      if (primaryLocation) {
        // Update existing location with new address
        await updateLocation.mutateAsync({
          id: primaryLocation.id,
          updates: {
            address: fullAddress,
            access_notes: trimmedData.access_notes,
          }
        });
        // Re-geocode if address changed
        geocodeLocation(primaryLocation.id, true);
      } else {
        // Create new location from client address data
        const newLocation = await createLocation.mutateAsync({
          client_id: client.id,
          address: fullAddress,
          access_notes: trimmedData.access_notes,
          name: `${trimmedData.company_name} - Primary Location`,
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
