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

    // Handle location (address) update or creation
    if (data.address) {
      const primaryLocation = locations[0];
      
      if (primaryLocation) {
        // Update existing location
        await updateLocation.mutateAsync({
          id: primaryLocation.id,
          updates: {
            address: data.address,
            access_notes: data.access_notes || null,
          }
        });
      } else {
        // Create new location
        await createLocation.mutateAsync({
          client_id: client.id,
          address: data.address,
          access_notes: data.access_notes || null,
          name: data.address,
          organization_id: client.organization_id,
        });
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
