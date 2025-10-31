import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDataTable } from "@/hooks/useDataTable";
import { useClientsWithTable } from "@/hooks/useClientsWithTable";
import { useDeleteClient } from "@/hooks/useClients";
import { usePricingTiers } from "@/hooks/usePricingTiers";
import { DataTable, Column } from "@/components/DataTable";
import { CSVImportDialog } from "@/components/csv/CSVImportDialog";
import { CSVExportDialog } from "@/components/csv/CSVExportDialog";
import { EditClientDialog } from "@/components/EditClientDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Download, Edit, AlertTriangle, MailWarning, Trash2 } from "lucide-react";
import { SchedulePickupDialog } from "@/components/SchedulePickupDialog";
import { CreateClientDialog } from "@/components/CreateClientDialog";


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
  const { data: pricingTiers = [] } = usePricingTiers();
  const deleteClient = useDeleteClient();

  // Count clients without emails
  const clientsWithoutEmail = clientsData?.data?.filter(client => !client.email) || [];
  const missingEmailCount = clientsWithoutEmail.length;

  const columns: Column<Client>[] = [
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
      title: 'Status',
      sortable: true,
      render: (value) => {
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
        <div className="flex items-center gap-1">
          <EditClientDialog
            client={row}
            trigger={
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            }
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{row.company_name}</strong>?
                  {row.open_balance && row.open_balance > 0 ? (
                    <span className="block mt-2 text-amber-600">
                      This client has an open balance of ${row.open_balance.toFixed(2)}. 
                      They will be deactivated instead of permanently deleted.
                    </span>
                  ) : (
                    <span className="block mt-2">
                      This action cannot be undone.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteClient.mutate(row.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
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

      <SchedulePickupDialog
        trigger={
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Pickup
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

        {missingEmailCount > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{missingEmailCount} client{missingEmailCount !== 1 ? 's' : ''}</strong> {missingEmailCount !== 1 ? 'are' : 'is'} missing email addresses. 
              Manifests cannot be automatically emailed to these clients. Please update their contact information.
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