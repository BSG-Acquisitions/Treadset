import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, FileText, DollarSign, MoreVertical, Pencil, Trash2, Trash } from "lucide-react";
import { useHaulers } from "@/hooks/useHaulers";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { InviteHaulerDialog } from "@/components/hauler/InviteHaulerDialog";
import { EditHaulerDialog } from "@/components/hauler/EditHaulerDialog";
import { useDeleteHauler } from "@/hooks/useIndependentHaulers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function IndependentHaulers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [selectedHauler, setSelectedHauler] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: haulers, isLoading } = useHaulers();
  const deleteHauler = useDeleteHauler();

  const handleEditHauler = (hauler: any) => {
    setSelectedHauler(hauler);
    setEditOpen(true);
  };

  const handleDeleteClick = (hauler: any) => {
    setSelectedHauler(hauler);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedHauler) {
      await deleteHauler.mutateAsync(selectedHauler.id);
      setDeleteOpen(false);
      setSelectedHauler(null);
    }
  };

  const handleDeleteAllManifests = async () => {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-all-manifests', {
        method: 'POST',
      });

      if (error) throw error;

      toast.success('All manifests deleted successfully');
      setDeleteAllOpen(false);
    } catch (error: any) {
      console.error('Error deleting manifests:', error);
      toast.error(error.message || 'Failed to delete manifests');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Independent Haulers
            </h1>
            <p className="text-muted-foreground">
              Manage independent haulers who bring tires to your facility
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDeleteAllOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete All Manifests
            </Button>
            <Button variant="outline" onClick={() => navigate("/hauler-rates")}>
              <DollarSign className="h-4 w-4 mr-2" />
              Manage Rates
            </Button>
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Hauler
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Haulers</CardTitle>
            <CardDescription>
              Licensed haulers in your system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading haulers...
              </div>
            ) : !haulers || haulers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No haulers yet. Add your first hauler to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Michigan Registration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {haulers.map((hauler: any) => (
                    <TableRow key={hauler.id}>
                      <TableCell className="font-medium">
                        {hauler.company_name || hauler.hauler_name || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {hauler.email && (
                            <div className="text-sm">{hauler.email}</div>
                          )}
                          {hauler.phone && (
                            <div className="text-sm text-muted-foreground">
                              {hauler.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {hauler.hauler_mi_reg || "N/A"}
                      </TableCell>
                      <TableCell>
                        {hauler.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(hauler.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditHauler(hauler)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(hauler)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <InviteHaulerDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <EditHaulerDialog 
        open={editOpen} 
        onOpenChange={setEditOpen} 
        hauler={selectedHauler} 
      />
      
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Hauler</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedHauler?.company_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Manifests</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete ALL manifests in the system? This will remove all test data and allow you to delete haulers. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAllManifests} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete All Manifests'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
