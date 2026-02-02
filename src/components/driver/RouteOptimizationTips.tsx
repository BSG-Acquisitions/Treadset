import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, MapPin, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverAssignments } from '@/hooks/useDriverAssignments';
import { useNearbySuggestions } from '@/hooks/useNearbySuggestions';
import { NearbyClientSuggestions } from '@/components/NearbyClientSuggestions';
import { format } from 'date-fns';

interface NearbySuggestion {
  client_id: string;
  company_name: string;
  distance: number;
  last_pickup_at: string | null;
  address: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface RouteOptimizationTipsProps {
  className?: string;
}

export function RouteOptimizationTips({ className }: RouteOptimizationTipsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: assignments = [], isLoading: assignmentsLoading } = useDriverAssignments(today);
  const { suggestNearby, isLoading: suggestionsLoading } = useNearbySuggestions();
  
  const [suggestions, setSuggestions] = useState<NearbySuggestion[]>([]);
  const [referenceClient, setReferenceClient] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Automatically fetch suggestions when assignments are loaded
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (hasFetched || !organizationId || assignments.length === 0) return;
      
      const firstAssignment = assignments[0];
      const clientId = firstAssignment.pickup?.client?.id;
      const clientName = firstAssignment.pickup?.client?.company_name || '';
      
      if (!clientId) return;
      
      setHasFetched(true);
      
      try {
        const result = await suggestNearby({
          scheduledClientId: clientId,
          organizationId,
        });
        
        if (result?.suggestions && result.suggestions.length > 0) {
          // Filter to only show high priority or clients not serviced in 30+ days
          const prioritySuggestions = result.suggestions.filter(s => {
            if (s.priority === 'high') return true;
            if (s.last_pickup_at) {
              const daysSince = Math.floor(
                (new Date().getTime() - new Date(s.last_pickup_at).getTime()) / (1000 * 60 * 60 * 24)
              );
              return daysSince >= 30;
            }
            return true; // Include clients with no pickup history
          }).slice(0, 3);
          
          setSuggestions(prioritySuggestions);
          setReferenceClient(clientName);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };
    
    fetchSuggestions();
  }, [assignments, organizationId, hasFetched, suggestNearby]);

  const isLoading = assignmentsLoading || suggestionsLoading;
  
  // Don't show if no assignments today
  if (!assignmentsLoading && assignments.length === 0) {
    return null;
  }
  
  // Don't show if no suggestions
  if (!isLoading && suggestions.length === 0) {
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
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Route Optimization Tips
          </CardTitle>
          <CardDescription>
            {isLoading 
              ? 'Finding nearby clients...'
              : `${suggestions.length} clients near today's stops haven't been picked up recently`
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
              {suggestions.map((suggestion) => {
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
                          {suggestion.distance.toFixed(1)} mi away
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
      
      <NearbyClientSuggestions
        open={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
        suggestions={suggestions}
        scheduledClientName={referenceClient}
      />
    </>
  );
}
