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

import { HaulerForm } from "@/components/forms/HaulerForm";
import {
  useHaulers,
  useCreateHauler,
  useUpdateHauler,
  useDeleteHauler,
  Hauler,
  CreateHaulerData,
} from "@/hooks/useHaulers";

export default function HaulerManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingHauler, setEditingHauler] = useState<Hauler | null>(null);

  const { data: haulers, isLoading } = useHaulers();
  const createMutation = useCreateHauler();
  const updateMutation = useUpdateHauler();
  const deleteMutation = useDeleteHauler();

  const handleCreate = (data: CreateHaulerData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setIsCreateOpen(false);
      },
    });
  };

  const handleUpdate = (data: CreateHaulerData) => {
    if (editingHauler) {
      updateMutation.mutate(
        { id: editingHauler.id, data },
        {
          onSuccess: () => {
            setEditingHauler(null);
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
      
      
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Hauler Management</h1>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Hauler
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border z-50">
              <DialogHeader>
                <DialogTitle>Add New Hauler</DialogTitle>
              </DialogHeader>
              <HaulerForm
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
                <TableHead>MI Registration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading haulers...
                  </TableCell>
                </TableRow>
              ) : haulers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No haulers found. Add your first hauler to get started.
                  </TableCell>
                </TableRow>
              ) : (
                haulers?.map((hauler) => (
                  <TableRow key={hauler.id}>
                    <TableCell className="font-medium">{hauler.hauler_name}</TableCell>
                    <TableCell>{hauler.hauler_mailing_address || "-"}</TableCell>
                    <TableCell>
                      {[hauler.hauler_city, hauler.hauler_state, hauler.hauler_zip]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </TableCell>
                    <TableCell>{hauler.hauler_phone || "-"}</TableCell>
                    <TableCell>{hauler.hauler_mi_reg || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Dialog
                          open={editingHauler?.id === hauler.id}
                          onOpenChange={(open) => !open && setEditingHauler(null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingHauler(hauler)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl bg-card border z-50">
                            <DialogHeader>
                              <DialogTitle>Edit Hauler</DialogTitle>
                            </DialogHeader>
                            <HaulerForm
                              initialData={editingHauler}
                              onSubmit={handleUpdate}
                              onCancel={() => setEditingHauler(null)}
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
                              <AlertDialogTitle>Deactivate Hauler</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to deactivate {hauler.hauler_name}? 
                                This will hide them from selection lists but preserve historical data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(hauler.id)}
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