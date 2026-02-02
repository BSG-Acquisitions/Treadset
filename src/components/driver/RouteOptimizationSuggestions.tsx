import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Clock, Calendar, Route, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { QuickScheduleDialog } from './QuickScheduleDialog';

interface RouteSuggestion {
  client_id: string;
  company_name: string;
  distance_from_route_miles: number;
  last_pickup_at: string | null;
  address: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  days_since_pickup: number | null;
}

interface RouteOptimizationSuggestionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alongRoute: RouteSuggestion[];
  overdue: RouteSuggestion[];
  selectedDate: string;
  stopCount: number;
  isLoading?: boolean;
}

export function RouteOptimizationSuggestions({
  open,
  onOpenChange,
  alongRoute,
  overdue,
  selectedDate,
  stopCount,
  isLoading = false,
}: RouteOptimizationSuggestionsProps) {
  const [activeTab, setActiveTab] = useState<string>('along-route');

  // Auto-select the tab that has results
  const defaultTab = useMemo(() => {
    if (alongRoute.length > 0) return 'along-route';
    if (overdue.length > 0) return 'overdue';
    return 'along-route';
  }, [alongRoute.length, overdue.length]);

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<RouteSuggestion | null>(null);

  const formattedDate = selectedDate 
    ? format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMM d')
    : 'Selected Day';

  // Parse selectedDate to use as default date for scheduling
  const defaultPickupDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
    }
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    if (priority === 'high') return '🔴';
    if (priority === 'medium') return '🟡';
    return '🟢';
  };

  const handleScheduleClient = (suggestion: RouteSuggestion) => {
    setSelectedSuggestion(suggestion);
    setScheduleDialogOpen(true);
  };

  const SuggestionCard = ({ suggestion }: { suggestion: RouteSuggestion }) => (
    <div className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{getPriorityIcon(suggestion.priority)}</span>
          <h4 className="font-semibold text-sm truncate">{suggestion.company_name}</h4>
        </div>
        <Badge variant={getPriorityColor(suggestion.priority)} className="flex-shrink-0 text-xs">
          {suggestion.priority}
        </Badge>
      </div>
      
      <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{suggestion.distance_from_route_miles.toFixed(1)} mi detour</span>
        </div>
        {suggestion.days_since_pickup !== null && (
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>{suggestion.days_since_pickup} days since last pickup</span>
          </div>
        )}
        {suggestion.address && (
          <div className="flex items-start gap-2">
            <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">{suggestion.address}</span>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground italic mb-3 line-clamp-2">
        "{suggestion.reasoning}"
      </p>

      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="default" 
          className="flex-1 text-xs"
          onClick={() => handleScheduleClient(suggestion)}
        >
          <Calendar className="h-3 w-3 mr-1" />
          Quick Schedule
        </Button>
      </div>
    </div>
  );

  const totalSuggestions = alongRoute.length + overdue.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-brand-primary" />
            Route Building Suggestions
          </DialogTitle>
          <DialogDescription>
            {formattedDate} • Analyzing {stopCount} scheduled stop{stopCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Finding nearby shops...</span>
          </div>
        ) : totalSuggestions === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No Suggestions Found</h3>
            <p className="text-sm text-muted-foreground">
              No additional clients found within 10 miles of your route
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="along-route" className="text-xs">
                <Route className="h-3 w-3 mr-1" />
                Along Route ({alongRoute.length})
              </TabsTrigger>
              <TabsTrigger value="overdue" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Overdue ({overdue.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="along-route" className="flex-1 mt-3 min-h-0">
              <ScrollArea className="h-[350px] pr-4">
                {alongRoute.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No clients found within 2 miles of your route
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alongRoute.map((suggestion) => (
                      <SuggestionCard key={suggestion.client_id} suggestion={suggestion} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="overdue" className="flex-1 mt-3 min-h-0">
              <ScrollArea className="h-[350px] pr-4">
                {overdue.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No overdue clients found near your route
                  </div>
                ) : (
                  <div className="space-y-3">
                    {overdue.map((suggestion) => (
                      <SuggestionCard key={suggestion.client_id} suggestion={suggestion} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Quick Schedule Dialog for selected suggestion */}
      {selectedSuggestion && (
        <QuickScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          clientId={selectedSuggestion.client_id}
          clientName={selectedSuggestion.company_name}
          clientAddress={selectedSuggestion.address}
          defaultDate={defaultPickupDate}
          onSuccess={() => {
            setSelectedSuggestion(null);
          }}
        />
      )}
    </Dialog>
  );
}
