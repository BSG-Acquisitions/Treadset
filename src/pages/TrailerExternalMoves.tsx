import { useState, useEffect } from "react";
import { useTrailers } from "@/hooks/useTrailers";
import { useCreateTrailerEvent, EVENT_TYPE_LABELS, TrailerEventType } from "@/hooks/useTrailerEvents";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Truck, MapPin, AlertCircle, AlertTriangle, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
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

// Only external event types for this form
const EXTERNAL_EVENT_TYPES: TrailerEventType[] = [
  'external_pickup',
  'external_drop',
];

interface ExternalMoveRecord {
  id: string;
  trailer_id: string;
  event_type: TrailerEventType;
  location_name: string | null;
  timestamp: string;
  notes: string | null;
  created_at: string;
  trailer?: {
    trailer_number: string;
  };
}

// Hook for fetching external moves with real-time updates
const useExternalMoves = () => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['external-moves', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('trailer_events')
        .select(`
          id,
          trailer_id,
          event_type,
          location_name,
          timestamp,
          notes,
          created_at,
          trailer:trailers!trailer_events_trailer_id_fkey(trailer_number)
        `)
        .eq('organization_id', orgId)
        .in('event_type', ['external_pickup', 'external_drop'])
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ExternalMoveRecord[];
    },
    enabled: !!orgId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel('external-moves-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trailer_events',
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['external-moves', orgId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  return query;
};

export default function TrailerExternalMoves() {
  const { user } = useAuth();
  const { data: trailers, isLoading: trailersLoading } = useTrailers();
  const { data: externalMoves, isLoading: movesLoading } = useExternalMoves();
  const createEvent = useCreateTrailerEvent();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    trailer_id: '',
    event_type: '' as TrailerEventType | '',
    location_name: '',
    timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: '',
  });

  const [showInTransitWarning, setShowInTransitWarning] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // Feature flag check
  if (!FEATURE_FLAGS.TRAILERS) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Trailer feature is disabled.</p>
      </div>
    );
  }

  const selectedTrailer = trailers?.find(t => t.id === formData.trailer_id);
  const activeTrailers = trailers?.filter(t => t.is_active) || [];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.trailer_id || !formData.event_type || !formData.location_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if trailer is inactive
    if (selectedTrailer && !selectedTrailer.is_active) {
      toast.error('Cannot log moves for inactive trailers');
      return;
    }

    // Check if trailer is in transit and warn user
    if (selectedTrailer?.current_status === 'in_transit' && !pendingSubmit) {
      setShowInTransitWarning(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('trailer_events')
        .insert({
          organization_id: user?.currentOrganization?.id,
          trailer_id: formData.trailer_id,
          event_type: formData.event_type,
          location_name: formData.location_name,
          location_id: null,
          route_id: null,
          stop_id: null,
          driver_id: null,
          timestamp: new Date(formData.timestamp).toISOString(),
          notes: formData.notes || `External move logged by admin`,
        });

      if (error) throw error;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['external-moves'] });
      queryClient.invalidateQueries({ queryKey: ['trailers'] });
      queryClient.invalidateQueries({ queryKey: ['trailer-events'] });
      queryClient.invalidateQueries({ queryKey: ['trailer-inventory'] });

      toast.success('External move recorded successfully');

      // Reset form
      setFormData({
        trailer_id: '',
        event_type: '',
        location_name: '',
        timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        notes: '',
      });
      setPendingSubmit(false);
    } catch (error: any) {
      toast.error(`Failed to record move: ${error.message}`);
    }
  };

  const confirmInTransitSubmit = () => {
    setPendingSubmit(true);
    setShowInTransitWarning(false);
    handleSubmit();
  };

  const getEventTypeBadgeVariant = (eventType: string) => {
    switch (eventType) {
      case 'external_pickup':
        return 'default';
      case 'external_drop':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">External Trailer Moves</h1>
        <p className="text-muted-foreground">
          Log trailer movements that occur outside of scheduled routes (Admin only)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* External Move Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Log External Move
            </CardTitle>
            <CardDescription>
              Record trailer movements by third parties or unscheduled internal moves
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="trailer">Select Trailer *</Label>
                <Select
                  value={formData.trailer_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, trailer_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a trailer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeTrailers.map(trailer => (
                      <SelectItem key={trailer.id} value={trailer.id}>
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          {trailer.trailer_number}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {trailer.current_status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedTrailer && (
                  <div className="mt-2 p-2 bg-muted rounded-lg text-sm space-y-1">
                    <div>
                      <span className="text-muted-foreground">Current location: </span>
                      <span className="font-medium">
                        {selectedTrailer.current_location || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status: </span>
                      <Badge variant="outline" className="text-xs">
                        {selectedTrailer.current_status}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="event_type">Event Type *</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value as TrailerEventType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EXTERNAL_EVENT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {EVENT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="location">New Location *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={formData.location_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
                    placeholder="Enter location name or address"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="timestamp">Timestamp *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="timestamp"
                    type="datetime-local"
                    value={formData.timestamp}
                    onChange={(e) => setFormData(prev => ({ ...prev, timestamp: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional details about this move..."
                  rows={3}
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div className="text-amber-700 dark:text-amber-300">
                  <strong>Note:</strong> This will update the trailer's status and location based on the event type.
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createEvent.isPending || !formData.trailer_id || !formData.event_type || !formData.location_name}
              >
                {createEvent.isPending ? 'Recording...' : 'Record External Move'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent External Moves Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent External Moves
            </CardTitle>
            <CardDescription>
              History of external trailer movements (most recent first)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {movesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !externalMoves?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No external moves recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trailer #</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {externalMoves.map((move) => (
                      <TableRow key={move.id}>
                        <TableCell className="font-medium">
                          {move.trailer?.trailer_number || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getEventTypeBadgeVariant(move.event_type)}>
                            {EVENT_TYPE_LABELS[move.event_type as TrailerEventType] || move.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {move.location_name || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(move.timestamp), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            Admin
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* In-Transit Warning Dialog */}
      <AlertDialog open={showInTransitWarning} onOpenChange={setShowInTransitWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Trailer Currently In Transit
            </AlertDialogTitle>
            <AlertDialogDescription>
              This trailer is currently marked as "in transit". Logging an external move will update its status and location.
              <br /><br />
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSubmit(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmInTransitSubmit}>
              Confirm External Move
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
