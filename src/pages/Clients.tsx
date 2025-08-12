import { useState } from "react";
import { ClientsList } from "@/components/lists/ClientsList";
import { ClientForm } from "@/components/forms/ClientForm";
import { useCreateClient, useUpdateClient } from "@/hooks/useClients";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ClientFormData } from "@/lib/validations";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"];

export default function Clients() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  const handleCreate = () => {
    setEditingClient(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: ClientFormData) => {
    try {
      if (editingClient) {
        await updateClient.mutateAsync({ id: editingClient.id, updates: data });
      } else {
        await createClient.mutateAsync({
          ...data,
          company_name: data.company_name!, // Ensure required field is present
        });
      }
      setIsDialogOpen(false);
      setEditingClient(null);
    } catch (error) {
      // Error is handled by the mutation hooks
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingClient(null);
  };

  const isLoading = createClient.isPending || updateClient.isPending;

  return (
    <main className="min-h-screen bg-background">
      <div className="container py-6">
        <ClientsList onCreateClick={handleCreate} onEditClick={handleEdit} />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Edit Client" : "Create Client"}
            </DialogTitle>
          </DialogHeader>
          <ClientForm
            initialData={editingClient || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}