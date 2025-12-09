import { useState, useMemo } from "react";
import { useTrailerInventory, useTrailerLocations, useTrailerDrivers, TrailerWithLastEvent } from "@/hooks/useTrailerInventory";
import { useCreateTrailer, useDeleteTrailer, TrailerStatus } from "@/hooks/useTrailers";
import { TrailerDetailModal } from "@/components/trailers/TrailerDetailModal";
import { TrailerCard } from "@/components/trailers/TrailerCard";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Truck, 
  Search, 
  Filter, 
  RefreshCw,
  Package,
  PackageOpen,
  ArrowDownToLine,
  Clock,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Status column configuration
const STATUS_COLUMNS: { status: TrailerStatus; label: string; icon: typeof Package; color: string }[] = [
  { status: 'empty', label: 'Empty', icon: PackageOpen, color: 'bg-green-500' },
  { status: 'full', label: 'Full', icon: Package, color: 'bg-red-500' },
  { status: 'staged', label: 'Staged', icon: ArrowDownToLine, color: 'bg-blue-500' },
  { status: 'in_transit', label: 'In Transit', icon: Truck, color: 'bg-yellow-500' },
  { status: 'waiting_unload', label: 'Waiting to Unload', icon: Clock, color: 'bg-orange-500' },
];

export default function TrailerInventory() {
  // Feature flag check
  if (!FEATURE_FLAGS.TRAILERS) {
    return null;
  }

  const { data: trailers, isLoading, refetch, isFetching } = useTrailerInventory();
  const locations = useTrailerLocations();
  const { data: drivers } = useTrailerDrivers();
  const createTrailer = useCreateTrailer();
  const deleteTrailer = useDeleteTrailer();
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TrailerStatus | "all">("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  
  // Modal state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTrailer, setSelectedTrailer] = useState<TrailerWithLastEvent | null>(null);
  const [newTrailer, setNewTrailer] = useState({ 
    trailer_number: '', 
    notes: '', 
    ownership_type: '',
    owner_name: '' 
  });

  // Filter trailers
  const filteredTrailers = useMemo(() => {
    if (!trailers) return [];
    
    return trailers.filter(trailer => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!trailer.trailer_number.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Status filter
      if (statusFilter !== "all" && trailer.current_status !== statusFilter) {
        return false;
      }
      
      // Location filter
      if (locationFilter !== "all") {
        if (!trailer.current_location || trailer.current_location !== locationFilter) {
          return false;
        }
      }
      
      // Driver filter (based on last event driver)
      if (driverFilter !== "all") {
        if (!trailer.last_event?.driver_id || trailer.last_event.driver_id !== driverFilter) {
          return false;
        }
      }
      
      return true;
    });
  }, [trailers, searchQuery, statusFilter, locationFilter, driverFilter]);

  // Group by status
  const trailersByStatus = useMemo(() => {
    const grouped: Record<TrailerStatus, TrailerWithLastEvent[]> = {
      empty: [],
      full: [],
      staged: [],
      in_transit: [],
      waiting_unload: [],
    };
    
    filteredTrailers.forEach(trailer => {
      grouped[trailer.current_status].push(trailer);
    });
    
    return grouped;
  }, [filteredTrailers]);

  const handleAddTrailer = async () => {
    if (!newTrailer.trailer_number.trim()) return;
    
    await createTrailer.mutateAsync({
      trailer_number: newTrailer.trailer_number,
      notes: newTrailer.notes || undefined,
      ownership_type: newTrailer.ownership_type || undefined,
      owner_name: newTrailer.owner_name || undefined,
    });
    setNewTrailer({ trailer_number: '', notes: '', ownership_type: '', owner_name: '' });
    setShowAddDialog(false);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setLocationFilter("all");
    setDriverFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || locationFilter !== "all" || driverFilter !== "all";

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-16 bg-muted rounded" />
          <div className="grid grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-64 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trailer Inventory</h1>
          <p className="text-muted-foreground">
            Real-time status board • {trailers?.length || 0} trailers
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Trailer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Trailer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="trailer_number">Trailer Number</Label>
                  <Input
                    id="trailer_number"
                    value={newTrailer.trailer_number}
                    onChange={(e) => setNewTrailer(prev => ({ ...prev, trailer_number: e.target.value }))}
                    placeholder="e.g., T-001"
                  />
                </div>
                
                <div>
                  <Label htmlFor="ownership_type">Ownership Type</Label>
                  <Input
                    id="ownership_type"
                    value={newTrailer.ownership_type}
                    onChange={(e) => setNewTrailer(prev => ({ ...prev, ownership_type: e.target.value }))}
                    placeholder="e.g., Owned, Rented, Leased"
                  />
                </div>
                
                <div>
                  <Label htmlFor="owner_name">Owner / Company Name</Label>
                  <Input
                    id="owner_name"
                    value={newTrailer.owner_name}
                    onChange={(e) => setNewTrailer(prev => ({ ...prev, owner_name: e.target.value }))}
                    placeholder="e.g., ABC Trailer Rentals, or leave blank if owned"
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={newTrailer.notes}
                    onChange={(e) => setNewTrailer(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional information..."
                  />
                </div>
                <Button 
                  onClick={handleAddTrailer} 
                  disabled={!newTrailer.trailer_number.trim() || createTrailer.isPending}
                  className="w-full"
                >
                  {createTrailer.isPending ? 'Adding...' : 'Add Trailer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto text-xs">
                Clear all
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search trailer number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TrailerStatus | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_COLUMNS.map(col => (
                  <SelectItem key={col.status} value={col.status}>
                    {col.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Location Filter */}
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Driver Filter */}
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Drivers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drivers</SelectItem>
                {drivers?.map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.first_name} {driver.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Status Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {STATUS_COLUMNS.map(column => {
          const columnTrailers = trailersByStatus[column.status];
          const Icon = column.icon;
          
          return (
            <Card key={column.status} className="flex flex-col">
              <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className={cn("p-1.5 rounded", column.color)}>
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span>{column.label}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {columnTrailers.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 pt-0">
                <ScrollArea className="h-[calc(100vh-380px)] min-h-[300px]">
                  <div className="space-y-2 pr-2">
                    {columnTrailers.length > 0 ? (
                      columnTrailers.map(trailer => (
                        <TrailerCard
                          key={trailer.id}
                          trailer={trailer}
                          onClick={() => setSelectedTrailer(trailer)}
                          compact
                        />
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Truck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No trailers</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {STATUS_COLUMNS.map(column => {
          const count = trailersByStatus[column.status].length;
          const total = filteredTrailers.length;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          
          return (
            <div key={column.status} className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs text-muted-foreground">{column.label}</div>
              <div className="text-xs text-muted-foreground">{percentage}%</div>
            </div>
          );
        })}
      </div>

      {/* Trailer Detail Modal */}
      <TrailerDetailModal
        trailer={selectedTrailer}
        open={!!selectedTrailer}
        onOpenChange={(open) => !open && setSelectedTrailer(null)}
      />
    </div>
  );
}
