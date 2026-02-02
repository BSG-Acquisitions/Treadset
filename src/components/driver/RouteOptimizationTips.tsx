import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, ChevronRight, Loader2, Route as RouteIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverAssignments } from '@/hooks/useDriverAssignments';
import { useDriverRouteSuggestions, type StopLocation, type RouteSuggestion } from '@/hooks/useDriverRouteSuggestions';
import { RouteOptimizationSuggestions } from './RouteOptimizationSuggestions';
import { format } from 'date-fns';

interface RouteOptimizationTipsProps {
  className?: string;
}

export function RouteOptimizationTips({ className }: RouteOptimizationTipsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: assignments = [], isLoading: assignmentsLoading } = useDriverAssignments(today);
  const { getRouteSuggestions, isLoading: suggestionsLoading } = useDriverRouteSuggestions();
  
  const [alongRoute, setAlongRoute] = useState<RouteSuggestion[]>([]);
  const [overdue, setOverdue] = useState<RouteSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Automatically fetch suggestions when assignments are loaded
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (hasFetched || !organizationId || assignments.length === 0) return;
      
      // Extract location data from all today's stops
      const scheduledStops: StopLocation[] = assignments
        .filter(a => a.pickup?.location?.latitude && a.pickup?.location?.longitude)
        .map(a => ({
          client_id: a.pickup?.client?.id || '',
          company_name: a.pickup?.client?.company_name || 'Unknown',
          latitude: a.pickup?.location?.latitude || 0,
          longitude: a.pickup?.location?.longitude || 0,
          address: a.pickup?.location?.address || '',
        }));
      
      if (scheduledStops.length === 0) return;
      
      setHasFetched(true);
      
      try {
        const result = await getRouteSuggestions({
          scheduledStops,
          organizationId,
          routeDate: today,
        });
        
        setAlongRoute(result.along_route || []);
        setOverdue(result.overdue || []);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };
    
    fetchSuggestions();
  }, [assignments, organizationId, hasFetched, getRouteSuggestions, today]);

  const isLoading = assignmentsLoading || suggestionsLoading;
  const allSuggestions = [...alongRoute, ...overdue].slice(0, 3);
  
  // Don't show if no assignments today
  if (!assignmentsLoading && assignments.length === 0) {
    return null;
  }
  
  // Don't show if no suggestions
  if (!isLoading && allSuggestions.length === 0) {
    return null;
  }

  const handleViewAllSuggestions = () => {
    setSuggestionsOpen(true);
  };

  const handleGoToRoutes = () => {
    navigate('/routes/driver');
  };

  const getDaysSince = (dateStr: string | null): number | null => {
    if (!dateStr) return null;
    return Math.floor(
      (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <RouteIcon className="h-5 w-5 text-brand-primary" />
            Route Optimization Tips
          </CardTitle>
          <CardDescription>
            {isLoading 
              ? 'Analyzing your route...'
              : `${alongRoute.length + overdue.length} clients near today's ${assignments.length} stops`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {allSuggestions.map((suggestion) => {
                const daysSince = getDaysSince(suggestion.last_pickup_at);
                return (
                  <div 
                    key={suggestion.client_id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{suggestion.company_name}</span>
                        {suggestion.priority === 'high' && (
                          <Badge variant="destructive" className="text-xs">High Priority</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {suggestion.distance_from_route_miles.toFixed(1)} mi detour
                        </span>
                        {daysSince !== null && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {daysSince} days ago
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                );
              })}
              
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={handleViewAllSuggestions}
                >
                  View All Suggestions
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={handleGoToRoutes}
                >
                  Open Route Builder
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <RouteOptimizationSuggestions
        open={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
        alongRoute={alongRoute}
        overdue={overdue}
        selectedDate={today}
        stopCount={assignments.length}
      />
    </>
  );
}
