import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTrailerRoutes, TrailerRoute } from "@/hooks/useTrailerRoutes";
import { useDeleteTrailerRoute, useUpdateTrailerRouteStatus } from "@/hooks/useTrailerRouteActions";
import { EditTrailerRouteDialog } from "@/components/trailers/EditTrailerRouteDialog";
import { TrailerRouteWizard } from "@/components/trailers/TrailerRouteWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Plus, CalendarIcon, Truck, MapPin, User, Play, CheckCircle, Trash2, Eye, XCircle, Container, Pencil } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { isFeatureEnabled } from "@/lib/featureFlags";

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function TrailerRoutes() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  
  const { data: routes, isLoading } = useTrailerRoutes(selectedDate?.toISOString().split('T')[0]);
  const deleteRoute = useDeleteTrailerRoute();
  const updateStatus = useUpdateTrailerRouteStatus();

  // Check feature flag
  if (!isFeatureEnabled('TRAILERS')) {
    return null;
  }

  const handleStatusChange = async (routeId: string, status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled') => {
    await updateStatus.mutateAsync({ routeId, status });
  };

  const handleDelete = async (routeId: string) => {
    await deleteRoute.mutateAsync(routeId);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trailer Routes</h1>
          <p className="text-muted-foreground">Plan and manage trailer move routes</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'All Dates'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
              />
              {selectedDate && (
                <div className="p-2 border-t">
                  <Button 
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => setSelectedDate(undefined)}
                  >
                    Clear Filter
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          
          <Dialog open={showCreateWizard} onOpenChange={setShowCreateWizard}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Route
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Trailer Route</DialogTitle>
              </DialogHeader>
              <TrailerRouteWizard
                onComplete={() => setShowCreateWizard(false)}
                onCancel={() => setShowCreateWizard(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Routes List */}
      <div className="grid gap-4">
        {routes?.map(route => (
          <Card key={route.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{route.route_name}</CardTitle>
                  <Badge className={STATUS_COLORS[route.status]}>
                    {route.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {/* View Details */}
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => navigate(`/trailers/routes/${route.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  
                  {/* Status Actions */}
                  {route.status === 'draft' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange(route.id, 'scheduled')}
                      disabled={updateStatus.isPending}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Schedule
                    </Button>
                  )}
                  {route.status === 'scheduled' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleStatusChange(route.id, 'in_progress')}
                        disabled={updateStatus.isPending}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleStatusChange(route.id, 'cancelled')}
                        disabled={updateStatus.isPending}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {route.status === 'in_progress' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange(route.id, 'completed')}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                  )}
                  
                  {/* Delete */}
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Route?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{route.route_name}" and all its stops.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(route.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  {format(new Date(route.scheduled_date), 'MMM d, yyyy')}
                </span>
                {route.driver && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {route.driver.first_name} {route.driver.last_name}
                  </span>
                )}
                {route.vehicle && (
                  <span className="flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    {route.vehicle.vehicle_number}
                  </span>
                )}
                {route.trailer && (
                  <span className="flex items-center gap-1">
                    <Container className="h-4 w-4" />
                    Trailer: {route.trailer.trailer_number}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {route.stops?.length || 0} stops
                </span>
              </div>
            </CardHeader>
            {route.stops && route.stops.length > 0 && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {route.stops
                    .sort((a, b) => a.sequence_number - b.sequence_number)
                    .slice(0, 3)
                    .map((stop, index) => (
                      <div 
                        key={stop.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg bg-muted/50",
                          stop.completed_at && "opacity-60"
                        )}
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{stop.location_name}</div>
                          {stop.location_address && (
                            <div className="text-xs text-muted-foreground">
                              {stop.location_address}
                            </div>
                          )}
                        </div>
                        {stop.completed_at && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    ))}
                  {route.stops.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center pt-1">
                      +{route.stops.length - 3} more stops
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
        
        {(!routes || routes.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No trailer routes found</p>
              <p className="text-sm">Create a new route to get started</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
