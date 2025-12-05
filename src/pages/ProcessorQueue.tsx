import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { TrailerDetailModal } from "@/components/trailers/TrailerDetailModal";
import { TrailerEventType } from "@/hooks/useTrailerEvents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
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
} from "@/components/ui/alert-dialog";
import { 
  Container, 
  Search, 
  Clock, 
  CheckCircle, 
  MapPin,
  User,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, differenceInHours, differenceInDays } from "date-fns";

interface WaitingTrailer {
  id: string;
  trailer_number: string;
  current_location: string | null;
  notes: string | null;
  last_event?: {
    id: string;
    event_type: string;
    timestamp: string;
    location_name: string | null;
    driver_id: string | null;
    driver?: {
      first_name: string | null;
      last_name: string | null;
    };
  };
}

type DurationFilter = 'all' | '0-24h' | '1-3d' | '3-7d' | '>7d';

const ProcessorQueue = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = user?.currentOrganization?.id;

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");
  
  // UI state
  const [selectedTrailer, setSelectedTrailer] = useState<WaitingTrailer | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [confirmUnloadId, setConfirmUnloadId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Feature flag check
  useEffect(() => {
    if (!FEATURE_FLAGS.TRAILERS) {
      navigate('/');
    }
  }, [navigate]);

  // Update duration display every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch trailers with waiting_unload status
  const { data: waitingTrailers, isLoading, refetch } = useQuery({
    queryKey: ['processor-queue', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      // Fetch trailers with waiting_unload status
      const { data: trailers, error: trailersError } = await supabase
        .from('trailers')
        .select('*')
        .eq('organization_id', orgId)
        .eq('current_status', 'waiting_unload')
        .eq('is_active', true)
        .order('trailer_number');

      if (trailersError) throw trailersError;
      if (!trailers || trailers.length === 0) return [];

      const trailerIds = trailers.map(t => t.id);

      // Fetch latest event for each trailer
      const { data: events, error: eventsError } = await supabase
        .from('trailer_events')
        .select('id, trailer_id, event_type, timestamp, location_name, driver_id')
        .eq('organization_id', orgId)
        .in('trailer_id', trailerIds)
        .order('timestamp', { ascending: false });

      if (eventsError) throw eventsError;

      // Get driver info
      const driverIds = [...new Set(events?.map(e => e.driver_id).filter(Boolean) || [])];
      let driverMap: Record<string, { first_name: string | null; last_name: string | null }> = {};
      
      if (driverIds.length > 0) {
        const { data: drivers } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', driverIds);
        
        if (drivers) {
          driverMap = drivers.reduce((acc, d) => {
            acc[d.id] = { first_name: d.first_name, last_name: d.last_name };
            return acc;
          }, {} as Record<string, { first_name: string | null; last_name: string | null }>);
        }
      }

      // Map latest event to each trailer
      const latestEventByTrailer: Record<string, typeof events[0]> = {};
      events?.forEach(event => {
        if (!latestEventByTrailer[event.trailer_id]) {
          latestEventByTrailer[event.trailer_id] = event;
        }
      });

      return trailers.map(trailer => ({
        ...trailer,
        last_event: latestEventByTrailer[trailer.id] ? {
          id: latestEventByTrailer[trailer.id].id,
          event_type: latestEventByTrailer[trailer.id].event_type,
          timestamp: latestEventByTrailer[trailer.id].timestamp,
          location_name: latestEventByTrailer[trailer.id].location_name,
          driver_id: latestEventByTrailer[trailer.id].driver_id,
          driver: latestEventByTrailer[trailer.id].driver_id
            ? driverMap[latestEventByTrailer[trailer.id].driver_id!]
            : undefined,
        } : undefined,
      })) as WaitingTrailer[];
    },
    enabled: !!orgId && FEATURE_FLAGS.TRAILERS,
    refetchInterval: 30000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel('processor-queue-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trailer_events' },
        () => queryClient.invalidateQueries({ queryKey: ['processor-queue', orgId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trailers' },
        () => queryClient.invalidateQueries({ queryKey: ['processor-queue', orgId] })
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, queryClient]);

  // Mark unloaded mutation
  const markUnloadedMutation = useMutation({
    mutationFn: async (trailerId: string) => {
      if (!orgId) throw new Error('No organization');
      
      const trailer = waitingTrailers?.find(t => t.id === trailerId);
      
      const { error } = await supabase
        .from('trailer_events')
        .insert({
          organization_id: orgId,
          trailer_id: trailerId,
          event_type: 'pickup_empty',
          location_name: trailer?.current_location || null,
          driver_id: null,
          notes: 'Processor confirmed trailer empty',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Trailer marked as unloaded and ready for pickup');
      queryClient.invalidateQueries({ queryKey: ['processor-queue'] });
      queryClient.invalidateQueries({ queryKey: ['trailer-inventory'] });
      setConfirmUnloadId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark unloaded: ${error.message}`);
    },
  });

  // Get unique locations for filter
  const locations = [...new Set(
    waitingTrailers?.map(t => t.current_location).filter((loc): loc is string => !!loc) || []
  )].sort();

  // Duration helper
  const getDurationCategory = (timestamp: string | undefined): DurationFilter => {
    if (!timestamp) return 'all';
    const hours = differenceInHours(new Date(), new Date(timestamp));
    const days = differenceInDays(new Date(), new Date(timestamp));
    
    if (hours < 24) return '0-24h';
    if (days < 3) return '1-3d';
    if (days < 7) return '3-7d';
    return '>7d';
  };

  const getDurationBadgeVariant = (timestamp: string | undefined) => {
    const category = getDurationCategory(timestamp);
    switch (category) {
      case '0-24h': return 'secondary';
      case '1-3d': return 'default';
      case '3-7d': return 'outline';
      case '>7d': return 'destructive';
      default: return 'secondary';
    }
  };

  // Filter trailers
  const filteredTrailers = waitingTrailers?.filter(trailer => {
    // Search filter
    if (searchQuery && !trailer.trailer_number.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Location filter
    if (locationFilter !== 'all' && trailer.current_location !== locationFilter) {
      return false;
    }
    // Duration filter
    if (durationFilter !== 'all') {
      const category = getDurationCategory(trailer.last_event?.timestamp);
      if (category !== durationFilter) return false;
    }
    return true;
  }) || [];

  const handleOpenDetail = (trailer: WaitingTrailer) => {
    setSelectedTrailer(trailer);
    setDetailModalOpen(true);
  };

  if (!FEATURE_FLAGS.TRAILERS) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Container className="h-6 w-6 text-brand-primary" />
            Processor Queue
          </h1>
          <p className="text-muted-foreground mt-1">
            Trailers waiting to be unloaded at processor locations
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by trailer #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[200px]">
                <MapPin className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={durationFilter} onValueChange={(v) => setDurationFilter(v as DurationFilter)}>
              <SelectTrigger className="w-[180px]">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Durations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Durations</SelectItem>
                <SelectItem value="0-24h">0–24 hours</SelectItem>
                <SelectItem value="1-3d">1–3 days</SelectItem>
                <SelectItem value="3-7d">3–7 days</SelectItem>
                <SelectItem value=">7d">&gt; 1 week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Waiting Trailers ({filteredTrailers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTrailers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Container className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No trailers waiting</p>
              <p className="text-sm">All trailers at processors have been unloaded</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trailer #</TableHead>
                  <TableHead>Processor Location</TableHead>
                  <TableHead>Arrived At</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Last Driver</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrailers.map(trailer => (
                  <TableRow key={trailer.id}>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto font-semibold text-brand-primary"
                        onClick={() => handleOpenDetail(trailer)}
                      >
                        #{trailer.trailer_number}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {trailer.current_location || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {trailer.last_event?.timestamp
                        ? new Date(trailer.last_event.timestamp).toLocaleString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getDurationBadgeVariant(trailer.last_event?.timestamp)}>
                        {trailer.last_event?.timestamp
                          ? formatDistanceToNow(new Date(trailer.last_event.timestamp), { addSuffix: false })
                          : 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {trailer.last_event?.driver ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {`${trailer.last_event.driver.first_name || ''} ${trailer.last_event.driver.last_name || ''}`.trim() || 'Unknown'}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">External</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => setConfirmUnloadId(trailer.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Unloaded
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Trailer Detail Modal */}
      <TrailerDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        trailer={selectedTrailer ? {
          id: selectedTrailer.id,
          trailer_number: selectedTrailer.trailer_number,
          current_status: 'waiting_unload' as const,
          current_location: selectedTrailer.current_location,
          current_location_id: null,
          notes: selectedTrailer.notes,
          is_active: true,
          created_at: '',
          updated_at: '',
          last_event: selectedTrailer.last_event ? {
            id: selectedTrailer.last_event.id,
            event_type: selectedTrailer.last_event.event_type as TrailerEventType,
            timestamp: selectedTrailer.last_event.timestamp,
            location_name: selectedTrailer.last_event.location_name,
            driver_id: selectedTrailer.last_event.driver_id,
            driver: selectedTrailer.last_event.driver,
          } : undefined,
        } : null}
      />

      {/* Confirm Unload Dialog */}
      <AlertDialog open={!!confirmUnloadId} onOpenChange={() => setConfirmUnloadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Trailer Unloaded</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the trailer as empty and ready for pickup. The trailer status will change from "Waiting to Unload" to "Empty" and remain at the current processor location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmUnloadId && markUnloadedMutation.mutate(confirmUnloadId)}
              disabled={markUnloadedMutation.isPending}
            >
              {markUnloadedMutation.isPending ? 'Processing...' : 'Confirm Unloaded'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProcessorQueue;
