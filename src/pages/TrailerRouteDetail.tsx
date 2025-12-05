import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDeleteTrailerRoute, useUpdateTrailerRouteStatus } from "@/hooks/useTrailerRouteActions";
import { useTrailerEvents, EVENT_TYPE_LABELS } from "@/hooks/useTrailerEvents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, 
  CalendarIcon, 
  User, 
  Truck, 
  MapPin, 
  Phone, 
  FileText, 
  Play, 
  CheckCircle, 
  Trash2,
  Container,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { isFeatureEnabled } from "@/lib/featureFlags";

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function TrailerRouteDetail() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;
  
  const deleteRoute = useDeleteTrailerRoute();
  const updateStatus = useUpdateTrailerRouteStatus();

  // Check feature flag
  if (!isFeatureEnabled('TRAILERS')) {
    navigate('/');
    return null;
  }

  // Fetch route details
  const { data: route, isLoading } = useQuery({
    queryKey: ['trailer-route-detail', routeId],
    queryFn: async () => {
      if (!routeId || !orgId) return null;
      
      const { data, error } = await supabase
        .from('trailer_routes')
        .select(`
          *,
          driver:users(id, first_name, last_name, email),
          vehicle:trailer_vehicles(id, vehicle_number, vehicle_type),
          stops:trailer_route_stops(*)
        `)
        .eq('id', routeId)
        .eq('organization_id', orgId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!routeId && !!orgId,
  });

  // Fetch events (we'll match by location_name since events don't have stop_id)
  const { data: events } = useTrailerEvents();

  const handleDelete = async () => {
    if (!routeId) return;
    await deleteRoute.mutateAsync(routeId);
    navigate('/trailers/routes');
  };

  const handleStatusChange = async (status: 'scheduled' | 'in_progress' | 'completed') => {
    if (!routeId) return;
    await updateStatus.mutateAsync({ routeId, status });
  };

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

  if (!route) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Route not found</p>
            <Button variant="link" onClick={() => navigate('/trailers/routes')}>
              Back to Routes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedStops = route.stops?.sort((a: any, b: any) => a.sequence_number - b.sequence_number) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/trailers/routes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{route.route_name}</h1>
            <Badge className={STATUS_COLORS[route.status]}>
              {route.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground">Trailer Route Details</p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {route.status === 'draft' && (
            <Button 
              variant="outline"
              onClick={() => handleStatusChange('scheduled')}
              disabled={updateStatus.isPending}
            >
              <Play className="h-4 w-4 mr-1" />
              Schedule
            </Button>
          )}
          {route.status === 'scheduled' && (
            <Button 
              variant="outline"
              onClick={() => handleStatusChange('in_progress')}
              disabled={updateStatus.isPending}
            >
              <Play className="h-4 w-4 mr-1" />
              Start Route
            </Button>
          )}
          {route.status === 'in_progress' && (
            <Button 
              variant="outline"
              onClick={() => handleStatusChange('completed')}
              disabled={updateStatus.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </Button>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Route?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this route and all associated stops. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Route Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Route Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Scheduled Date</div>
                <div className="font-medium">{format(new Date(route.scheduled_date), 'MMM d, yyyy')}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Driver</div>
                <div className="font-medium">
                  {route.driver 
                    ? `${route.driver.first_name} ${route.driver.last_name}`
                    : 'Unassigned'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Vehicle</div>
                <div className="font-medium">
                  {route.vehicle 
                    ? `${route.vehicle.vehicle_number}`
                    : 'Unassigned'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Stops</div>
                <div className="font-medium">{sortedStops.length} stops</div>
              </div>
            </div>
          </div>
          
          {route.notes && (
            <>
              <Separator className="my-4" />
              <div>
                <div className="text-sm text-muted-foreground mb-1">Notes</div>
                <p className="text-sm">{route.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stops */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Route Stops</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedStops.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No stops added to this route</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedStops.map((stop: any, index: number) => {
                // Find events that match this stop's location
                const stopEvents = events?.filter(e => e.location_name === stop.location_name) || [];
                
                return (
                  <div key={stop.id} className="relative">
                    {/* Connector line */}
                    {index < sortedStops.length - 1 && (
                      <div className="absolute left-3 top-10 bottom-0 w-0.5 bg-border" />
                    )}
                    
                    <div className="flex gap-4">
                      {/* Stop number */}
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 ${
                        stop.completed_at 
                          ? 'bg-green-500 text-white' 
                          : 'bg-primary text-primary-foreground'
                      }`}>
                        {stop.completed_at ? <CheckCircle className="h-4 w-4" /> : index + 1}
                      </div>
                      
                      {/* Stop details */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{stop.location_name}</div>
                            {stop.location_address && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {stop.location_address}
                              </div>
                            )}
                          </div>
                          {stop.completed_at && (
                            <Badge variant="outline" className="text-green-600">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(stop.completed_at), 'h:mm a')}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Contact info */}
                        {(stop.contact_name || stop.contact_phone) && (
                          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                            {stop.contact_name && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {stop.contact_name}
                              </span>
                            )}
                            {stop.contact_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {stop.contact_phone}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Instructions */}
                        {stop.instructions && (
                          <div className="mt-2 text-sm text-muted-foreground flex items-start gap-1">
                            <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                            {stop.instructions}
                          </div>
                        )}
                        
                        {/* Events for this stop */}
                        {stopEvents.length > 0 && (
                          <div className="mt-3 space-y-1">
                            <div className="text-xs font-medium text-muted-foreground uppercase">Events</div>
                            {stopEvents.map((event: any) => (
                              <div 
                                key={event.id}
                                className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
                              >
                                <Container className="h-3 w-3 text-muted-foreground" />
                                <Badge variant="outline" className="text-xs">
                                  {EVENT_TYPE_LABELS[event.event_type as keyof typeof EVENT_TYPE_LABELS]}
                                </Badge>
                                {event.trailer && (
                                  <span className="text-muted-foreground">
                                    {event.trailer.trailer_number}
                                  </span>
                                )}
                                {event.notes && (
                                  <span className="text-xs text-muted-foreground">
                                    — {event.notes}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
