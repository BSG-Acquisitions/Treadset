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
    try {
      // Update client with ALL form data including address fields
      await updateClient.mutateAsync({
        id: client.id,
        updates: {
          company_name: data.company_name,
          contact_name: data.contact_name || null,
          email: data.email || null,
          phone: data.phone || null,
          notes: data.notes || null,
          type: data.type || null,
          tags: data.tags || null,
          sla_weeks: data.sla_weeks || null,
          pricing_tier_id: data.pricing_tier_id || null,
          // CRITICAL FIX: Save all address fields that were missing
          mailing_address: data.mailing_address || null,
          city: data.city || null,
          state: data.state || null,
          zip: data.zip || null,
          county: data.county || null,
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
            name: data.address, // Use address as name for primary location
            organization_id: client.organization_id,
          });
        }
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error updating client:', error);
    }
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