import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDataTable } from "@/hooks/useDataTable";
import { useClientsWithTable } from "@/hooks/useClientsWithTable";
import { usePricingTiers } from "@/hooks/usePricingTiers";
import { DataTable, Column } from "@/components/DataTable";
import { CSVImportDialog } from "@/components/csv/CSVImportDialog";
import { CSVExportDialog } from "@/components/csv/CSVExportDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Download } from "lucide-react";
import { SchedulePickupDialog } from "@/components/SchedulePickupDialog";
import { SchedulePickupWithDriver } from "@/components/SchedulePickupWithDriver";
import { TopNav } from "@/components/TopNav";

type Client = {
  id: string;
  company_name: string;
  type: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  lifetime_revenue: number | null;
  open_balance: number | null;
  last_pickup_at: string | null;
  is_active: boolean;
  pricing_tier: { name: string } | null;
  locations: { count: number }[];
  pickups: { count: number }[];
};

export default function Clients() {
  useEffect(() => {
    document.title = "Clients – BSG";
  }, []);

  const tableState = useDataTable({
    defaultSortBy: 'company_name',
    defaultSortOrder: 'asc',
    urlStateKey: 'clients'
  });

  const { data: clientsData, isLoading } = useClientsWithTable({ tableState: tableState.state });
  const { data: pricingTiers = [] } = usePricingTiers();

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
      key: 'type',
      title: 'Type',
      sortable: true,
      render: (value) => value ? (
        <Badge variant="outline" className="capitalize">
          {value}
        </Badge>
      ) : null
    },
    {
      key: 'contact_name',
      title: 'Contact',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{value || '—'}</div>
          {row.email && (
            <div className="text-sm text-muted-foreground">{row.email}</div>
          )}
        </div>
      )
    },
    {
      key: 'lifetime_revenue',
      title: 'Revenue',
      sortable: true,
      render: (value) => (
        <span className="font-medium">
          ${(value || 0).toFixed(2)}
        </span>
      )
    },
    {
      key: 'open_balance',
      title: 'Balance',
      sortable: true,
      render: (value) => (
        <span className={`font-medium ${(value || 0) > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
          ${(value || 0).toFixed(2)}
        </span>
      )
    },
    {
      key: 'is_active',
      title: 'Status',
      sortable: true,
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
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

      <SchedulePickupWithDriver>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Schedule Pickup
        </Button>
      </SchedulePickupWithDriver>

      <Button asChild>
        <Link to="/book">
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Link>
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      
      <main className="container py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Manage your client database and track their business metrics.
          </p>
        </header>

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