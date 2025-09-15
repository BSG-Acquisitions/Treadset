import { useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TopNav } from "@/components/TopNav";
import { ReceiverForm } from "@/components/forms/ReceiverForm";
import {
  useReceivers,
  useCreateReceiver,
  useUpdateReceiver,
  useDeleteReceiver,
  Receiver,
  CreateReceiverData,
} from "@/hooks/useReceivers";

export default function ReceiverManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingReceiver, setEditingReceiver] = useState<Receiver | null>(null);

  const { data: receivers, isLoading } = useReceivers();
  const createMutation = useCreateReceiver();
  const updateMutation = useUpdateReceiver();
  const deleteMutation = useDeleteReceiver();

  const handleCreate = (data: CreateReceiverData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setIsCreateOpen(false);
      },
    });
  };

  const handleUpdate = (data: CreateReceiverData) => {
    if (editingReceiver) {
      updateMutation.mutate(
        { id: editingReceiver.id, data },
        {
          onSuccess: () => {
            setEditingReceiver(null);
          },
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Receiver Management</h1>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Receiver
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border z-50">
              <DialogHeader>
                <DialogTitle>Add New Receiver</DialogTitle>
              </DialogHeader>
              <ReceiverForm
                onSubmit={handleCreate}
                onCancel={() => setIsCreateOpen(false)}
                isLoading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>City, State ZIP</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading receivers...
                  </TableCell>
                </TableRow>
              ) : receivers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No receivers found. Add your first receiver to get started.
                  </TableCell>
                </TableRow>
              ) : (
                receivers?.map((receiver) => (
                  <TableRow key={receiver.id}>
                    <TableCell className="font-medium">{receiver.receiver_name}</TableCell>
                    <TableCell>{receiver.receiver_mailing_address || "-"}</TableCell>
                    <TableCell>
                      {[receiver.receiver_city, receiver.receiver_state, receiver.receiver_zip]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </TableCell>
                    <TableCell>{receiver.receiver_phone || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Dialog
                          open={editingReceiver?.id === receiver.id}
                          onOpenChange={(open) => !open && setEditingReceiver(null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingReceiver(receiver)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl bg-card border z-50">
                            <DialogHeader>
                              <DialogTitle>Edit Receiver</DialogTitle>
                            </DialogHeader>
                            <ReceiverForm
                              initialData={editingReceiver}
                              onSubmit={handleUpdate}
                              onCancel={() => setEditingReceiver(null)}
                              isLoading={updateMutation.isPending}
                            />
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border z-50">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deactivate Receiver</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to deactivate {receiver.receiver_name}? 
                                This will hide them from selection lists but preserve historical data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(receiver.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Deactivate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}