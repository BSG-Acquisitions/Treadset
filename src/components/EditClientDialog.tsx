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

  const handleSubmit = async (data: ClientFormData) => {
    try {
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
        }
      });
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
          isLoading={updateClient.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}