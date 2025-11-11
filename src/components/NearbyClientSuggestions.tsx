import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Calendar, Phone, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface NearbySuggestion {
  client_id: string;
  company_name: string;
  distance: number;
  last_pickup_at: string | null;
  address: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface NearbyClientSuggestionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: NearbySuggestion[];
  scheduledClientName: string;
}

const priorityColors = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
} as const;

export function NearbyClientSuggestions({
  open,
  onOpenChange,
  suggestions,
  scheduledClientName,
}: NearbyClientSuggestionsProps) {
  const navigate = useNavigate();
  const [calling, setCalling] = useState<string | null>(null);

  const handleViewClient = (clientId: string) => {
    navigate(`/clients/${clientId}`);
    onOpenChange(false);
  };

  const handleScheduleClient = (clientId: string) => {
    navigate(`/clients/${clientId}?action=schedule`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nearby Clients Suggestion</DialogTitle>
          <DialogDescription>
            You just scheduled a pickup for <strong>{scheduledClientName}</strong>. Consider calling
            these nearby clients to optimize your route:
          </DialogDescription>
        </DialogHeader>

        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No nearby clients found within 5 miles.
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.client_id} className="border-l-4" style={{
                borderLeftColor: suggestion.priority === 'high' ? 'hsl(var(--destructive))' : 
                                 suggestion.priority === 'medium' ? 'hsl(var(--primary))' : 
                                 'hsl(var(--muted))'
              }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-lg">{suggestion.company_name}</h4>
                        <Badge variant={priorityColors[suggestion.priority]}>
                          {suggestion.priority} priority
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{suggestion.distance.toFixed(1)} miles away</span>
                        </div>
                        {suggestion.last_pickup_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Last pickup: {formatDistanceToNow(new Date(suggestion.last_pickup_at), { addSuffix: true })}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground">{suggestion.address}</p>
                      
                      <div className="bg-muted/50 p-3 rounded-md">
                        <p className="text-sm"><strong>AI Reasoning:</strong> {suggestion.reasoning}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewClient(suggestion.client_id)}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleScheduleClient(suggestion.client_id)}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Schedule
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
