import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDataTable } from "@/hooks/useDataTable";
import { useClientsWithTable } from "@/hooks/useClientsWithTable";
import { useDeleteClient } from "@/hooks/useClients";
import { DataTable, Column } from "@/components/DataTable";
import { CSVImportDialog } from "@/components/csv/CSVImportDialog";
import { CSVExportDialog } from "@/components/csv/CSVExportDialog";
import { EditClientDialog } from "@/components/EditClientDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Upload, Download, Edit, AlertTriangle, MailWarning, Trash2 } from "lucide-react";
import { CreateClientDialog } from "@/components/CreateClientDialog";
import { format } from "date-fns";

import type { Database } from "@/integrations/supabase/types";

type Client = {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  lifetime_revenue: number | null;
  open_balance: number | null;
  last_pickup_at: string | null;
  is_active: boolean;
  pricing_tier: { name: string } | null;
  locations: { id?: string; address?: string; access_notes?: string }[];
  pickups: { count: number }[];
} & Database["public"]["Tables"]["clients"]["Row"];

// Separate component for delete dialog with state
function ClientActionsCell({ row, deleteClient }: { row: any; deleteClient: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);

  const handleDelete = () => {
    deleteClient.mutate({ id: row.id, forceDelete });
    setIsOpen(false);
    setForceDelete(false);
  };

  return (
    <div className="flex items-center gap-1">
      <EditClientDialog
        client={row}
        trigger={
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        }
      />
      <AlertDialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setForceDelete(false);
      }}>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>Are you sure you want to delete <strong>{row.company_name}</strong>?</p>
                {row.open_balance && row.open_balance > 0 && (
                  <p className="mt-2 text-amber-600">
                    This client has an open balance of ${row.open_balance.toFixed(2)}. 
                    They will be deactivated instead of permanently deleted unless you force delete.
                  </p>
                )}
                <div className="mt-4 flex items-start space-x-2 p-3 bg-destructive/10 rounded-md border border-destructive/20">
                  <Checkbox 
                    id={`force-delete-${row.id}`}
                    checked={forceDelete}
                    onCheckedChange={(checked) => setForceDelete(checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label 
                      htmlFor={`force-delete-${row.id}`}
                      className="text-sm font-medium text-destructive cursor-pointer"
                    >
                      Force Delete (Permanent)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete this client AND all related records (pickups, drop-offs, manifests, locations, workflows). This cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {forceDelete ? "Force Delete" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Clients() {
  useEffect(() => {
    document.title = "Clients – TreadSet";
  }, []);

  const tableState = useDataTable({
    defaultSortBy: 'company_name',
    defaultSortOrder: 'asc',
    urlStateKey: 'clients'
  });

  const { data: clientsData, isLoading } = useClientsWithTable({ tableState: tableState.state });
  const deleteClient = useDeleteClient();

  // Count clients with data quality issues
  const clientsWithoutEmail = clientsData?.data?.filter(client => !client.email) || [];
  const missingEmailCount = clientsWithoutEmail.length;
  
  // Count clients missing required manifest fields (city, state, county)
  const clientsMissingManifestFields = clientsData?.data?.filter(client => 
    !client.city || !client.state || !client.county
  ) || [];
  const missingManifestFieldsCount = clientsMissingManifestFields.length;

  const columns: Column<any>[] = [
    {
      key: 'company_name',
      title: 'Company',
      sortable: true,
      render: (value, row) => (
        <Link 
          to={`/clients/${row.id}`}
          className="font-medium text-primary hover:underline"
        >
          {value}
        </Link>
      )
    },
    {
      key: 'contact_name',
      title: 'Contact',
      sortable: true,
      render: (value, row) => (
        <div className="min-w-0 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{value || '—'}</div>
            {row.email ? (
              <div className="text-xs text-muted-foreground truncate">{row.email}</div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <MailWarning className="h-3 w-3" />
                <span>No email configured</span>
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'phone',
      title: 'Phone',
      sortable: true,
      render: (value) => (
        <span className="text-sm">
          {value || '—'}
        </span>
      )
    },
    {
      key: 'locations',
      title: 'Address',
      sortable: false,
      render: (value, row) => {
        const location = row.locations?.[0];
        const locationAddress = location?.address;
        const clientAddress = row.mailing_address 
          ? `${row.mailing_address}${row.city ? ', ' + row.city : ''}${row.state ? ', ' + row.state : ''}`
          : null;
        
        const displayAddress = locationAddress || clientAddress;
        
        return displayAddress ? (
          <div className="text-sm min-w-0">
            <div className="font-medium truncate">{displayAddress}</div>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">No address</span>
        );
      }
    },
    {
      key: 'last_pickup_at',
      title: 'Last Pickup',
      sortable: true,
      render: (value) => {
        if (!value) {
          return <span className="text-muted-foreground text-sm">No pickups yet</span>;
        }
        return (
          <span className="text-sm">
            {format(new Date(value), 'MMM d, yyyy')}
          </span>
        );
      }
    },
    {
      key: 'status',
      title: 'Status',
      sortable: false,
      render: (_, row) => {
        const value = row.last_pickup_at;
        if (!value) {
          return (
            <Badge variant="destructive" className="text-xs">
              No Service
            </Badge>
          );
        }
        
        const lastPickup = new Date(value);
        const now = new Date();
        const daysSincePickup = Math.floor((now.getTime() - lastPickup.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSincePickup <= 30) {
          return (
            <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
              Active
            </Badge>
          );
        } else {
          return (
            <Badge variant="destructive" className="text-xs">
              Over 30 Days
            </Badge>
          );
        }
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      sortable: false,
      render: (_, row) => (
        <ClientActionsCell row={row} deleteClient={deleteClient} />
      )
    }
  ];

  const actions = (
    <div className="flex items-center gap-2">
      <CSVExportDialog 
        trigger={
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />
      
      <CSVImportDialog 
        onSuccess={() => window.location.reload()}
        trigger={
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        }
      />

      <CreateClientDialog
        trigger={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        }
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Manage your client database and track their business metrics.
          </p>
        </header>

        {missingManifestFieldsCount > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-1">
              <span>
                <strong>{missingManifestFieldsCount} client{missingManifestFieldsCount !== 1 ? 's' : ''}</strong> {missingManifestFieldsCount !== 1 ? 'are' : 'is'} missing required address information (city, state, or county).
              </span>
              <span className="text-sm opacity-90">
                Michigan manifests cannot be generated correctly without complete address data. 
                {missingManifestFieldsCount <= 5 && clientsMissingManifestFields.length > 0 && (
                  <span className="font-medium"> Affected: {clientsMissingManifestFields.map(c => c.company_name).join(', ')}</span>
                )}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {missingEmailCount > 0 && (
          <Alert variant="default" className="mb-6 border-amber-500 bg-amber-500/10">
            <MailWarning className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>{missingEmailCount} client{missingEmailCount !== 1 ? 's' : ''}</strong> {missingEmailCount !== 1 ? 'are' : 'is'} missing email addresses. 
              Manifests cannot be automatically emailed to these clients.
            </AlertDescription>
          </Alert>
        )}

        <div className="container pb-12">
          <DataTable
            data={clientsData?.data || []}
            columns={columns}
            totalCount={clientsData?.totalCount || 0}
            currentPage={tableState.state.page}
            pageSize={tableState.state.pageSize}
            onPageChange={tableState.setPage}
            onPageSizeChange={tableState.setPageSize}
            search={tableState.state.search}
            onSearchChange={tableState.setSearch}
            sortBy={tableState.state.sortBy}
            sortOrder={tableState.state.sortOrder}
            onSortChange={tableState.setSort}
            loading={isLoading}
            emptyMessage="No clients found."
            actions={actions}
          />
        </div>
      </main>
    </div>
  );
}
