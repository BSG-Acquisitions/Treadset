import { useState } from "react";
import { useTrailers, useCreateTrailer, useDeleteTrailer, TrailerStatus } from "@/hooks/useTrailers";
import { useTrailerEvents, EVENT_TYPE_LABELS } from "@/hooks/useTrailerEvents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Truck, History, MapPin, Trash2 } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<TrailerStatus, string> = {
  empty: 'bg-green-100 text-green-800 border-green-200',
  full: 'bg-red-100 text-red-800 border-red-200',
  staged: 'bg-blue-100 text-blue-800 border-blue-200',
  in_transit: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  waiting_unload: 'bg-orange-100 text-orange-800 border-orange-200',
};

const STATUS_LABELS: Record<TrailerStatus, string> = {
  empty: 'Empty',
  full: 'Full',
  staged: 'Staged',
  in_transit: 'In Transit',
  waiting_unload: 'Waiting Unload',
};

export default function TrailerInventory() {
  const { data: trailers, isLoading } = useTrailers();
  const { data: events } = useTrailerEvents();
  const createTrailer = useCreateTrailer();
  const deleteTrailer = useDeleteTrailer();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(null);
  const [newTrailer, setNewTrailer] = useState({ trailer_number: '', notes: '' });

  const handleAddTrailer = async () => {
    if (!newTrailer.trailer_number.trim()) return;
    
    await createTrailer.mutateAsync(newTrailer);
    setNewTrailer({ trailer_number: '', notes: '' });
    setShowAddDialog(false);
  };

  const selectedTrailerEvents = events?.filter(e => e.trailer_id === selectedTrailerId) || [];

  // Group trailers by status for board view
  const trailersByStatus = trailers?.reduce((acc, trailer) => {
    const status = trailer.current_status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(trailer);
    return acc;
  }, {} as Record<TrailerStatus, typeof trailers>) || {};

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trailer Inventory</h1>
          <p className="text-muted-foreground">Track and manage all trailers</p>
        </div>
        
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

      {/* Status Board View */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {(Object.keys(STATUS_LABELS) as TrailerStatus[]).map(status => (
          <Card key={status} className="min-h-[200px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Badge className={STATUS_COLORS[status]}>
                  {STATUS_LABELS[status]}
                </Badge>
                <span className="text-muted-foreground">
                  ({trailersByStatus[status]?.length || 0})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {trailersByStatus[status]?.map(trailer => (
                <div
                  key={trailer.id}
                  className="p-3 bg-muted/50 rounded-lg border cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setSelectedTrailerId(trailer.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{trailer.trailer_number}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTrailer.mutate(trailer.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                  {trailer.current_location && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {trailer.current_location}
                    </div>
                  )}
                </div>
              ))}
              {(!trailersByStatus[status] || trailersByStatus[status].length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No trailers
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Event History Dialog */}
      <Dialog open={!!selectedTrailerId} onOpenChange={() => setSelectedTrailerId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Trailer History
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedTrailerEvents.map(event => (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {EVENT_TYPE_LABELS[event.event_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{event.location_name || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {event.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {selectedTrailerEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No events recorded
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
