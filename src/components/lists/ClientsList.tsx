import { useState } from "react";
import { Link } from "react-router-dom";
import { useClients, useDeleteClient } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Search, Plus, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { CapacityGauge } from "@/components/CapacityGauge";
import type { Database } from "@/integrations/supabase/types";

type Client = Database["public"]["Tables"]["clients"]["Row"] & {
  pricing_tier?: { name: string; rate?: number } | null;
  locations?: { count: number }[];
};

interface ClientsListProps {
  onCreateClick: () => void;
  onEditClick: (client: Client) => void;
}

export function ClientsList({ onCreateClick, onEditClick }: ClientsListProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<'updated_at' | 'lifetime_revenue' | 'company_name'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: clientsData, isLoading } = useClients({
    search,
    type: typeFilter || undefined,
    sortBy,
    sortOrder,
    page: currentPage,
    limit: 12
  });

  const deleteClient = useDeleteClient();

  const handleSort = (field: 'updated_at' | 'lifetime_revenue' | 'company_name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value === "all" ? "" : value);
    setCurrentPage(1);
  };

  const formatCurrency = (amount: number | null) => {
    return amount ? `$${amount.toLocaleString()}` : "$0";
  };

  const formatDate = (date: string | null) => {
    return date ? new Date(date).toLocaleDateString() : "Never";
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading...</div>;
  }

  const clients = clientsData?.data || [];
  const totalPages = clientsData?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
        <Button onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={typeFilter || "all"} onValueChange={handleTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="commercial">Commercial</SelectItem>
            <SelectItem value="residential">Residential</SelectItem>
            <SelectItem value="industrial">Industrial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSort('company_name')}
          className="flex items-center gap-1"
        >
          Name {getSortIcon('company_name')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSort('updated_at')}
          className="flex items-center gap-1"
        >
          Updated {getSortIcon('updated_at')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSort('lifetime_revenue')}
          className="flex items-center gap-1"
        >
          Revenue {getSortIcon('lifetime_revenue')}
        </Button>
      </div>

      {/* Clients Grid */}
      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No clients found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <Link 
                      to={`/clients/${client.id}`}
                      className="text-lg font-semibold text-foreground hover:text-primary"
                    >
                      {client.company_name}
                    </Link>
                    {client.contact_name && (
                      <p className="text-sm text-muted-foreground">{client.contact_name}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditClick(client)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Client</AlertDialogTitle>
                          <AlertDialogDescription>
                            {client.open_balance && client.open_balance > 0
                              ? `This client has an open balance of ${formatCurrency(client.open_balance)}. The client will be deactivated instead of deleted.`
                              : "Are you sure? This action cannot be undone."
                            }
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteClient.mutate(client.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {client.open_balance && client.open_balance > 0 ? "Deactivate" : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {client.email && (
                    <p className="text-muted-foreground">{client.email}</p>
                  )}
                  {client.phone && (
                    <p className="text-muted-foreground">{client.phone}</p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Revenue:</span>
                    <span className="font-medium">{formatCurrency(client.lifetime_revenue)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Last Pickup:</span>
                    <span className="font-medium">{formatDate(client.last_pickup_at)}</span>
                  </div>

                {/* Remove client type display */}

                  {client.pricing_tier && (
                    <Badge variant="secondary">
                      {client.pricing_tier.name}
                    </Badge>
                  )}

                  {client.tags && client.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {client.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {client.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{client.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              if (page > totalPages) return null;
              
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(page);
                    }}
                    isActive={currentPage === page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}