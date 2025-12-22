import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Calendar, ChevronDown } from 'lucide-react';
import { usePickupPatterns } from '@/hooks/usePickupPatterns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface PickupPatternsCardProps {
  clientId?: string;
}

export const PickupPatternsCard = ({ clientId }: PickupPatternsCardProps) => {
  const { data: patterns, isLoading } = usePickupPatterns();
  const [expandedFrequency, setExpandedFrequency] = useState<string | null>(null);

  if (isLoading) return null;
  if (!patterns || patterns.length === 0) return null;

  // Filter by clientId if provided (for client detail pages)
  const filteredPatterns = clientId 
    ? patterns.filter(p => p.client_id === clientId)
    : patterns;

  if (filteredPatterns.length === 0) return null;

  // If showing single client, use original simple display
  if (clientId) {
    const topPattern = filteredPatterns[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const typicalDay = topPattern.typical_day_of_week !== null 
      ? dayNames[topPattern.typical_day_of_week] 
      : null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Pickup Pattern
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Frequency</span>
              <span className="font-medium capitalize">{topPattern.frequency}</span>
            </div>
            {typicalDay && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Typical Day</span>
                <span className="font-medium">{typicalDay}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Interval</span>
              <span className="font-medium">{topPattern.average_days_between_pickups} days</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group patterns by frequency
  const weeklyClients = filteredPatterns.filter(p => p.frequency === 'weekly');
  const biweeklyClients = filteredPatterns.filter(p => p.frequency === 'biweekly');
  const monthlyClients = filteredPatterns.filter(p => p.frequency === 'monthly');

  const frequencyGroups = [
    { key: 'weekly', label: 'Weekly', clients: weeklyClients, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    { key: 'biweekly', label: 'Biweekly', clients: biweeklyClients, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    { key: 'monthly', label: 'Monthly', clients: monthlyClients, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  ].filter(g => g.clients.length > 0);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Pickup Pattern Intelligence
          </CardTitle>
        </div>
        <CardDescription>
          {filteredPatterns.length} clients with detected patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary Badges */}
        <div className="flex flex-wrap gap-2">
          {frequencyGroups.map(group => (
            <Badge key={group.key} variant="secondary" className={group.color}>
              <Users className="h-3 w-3 mr-1" />
              {group.clients.length} {group.label}
            </Badge>
          ))}
        </div>

        {/* Expandable Client Lists */}
        <div className="space-y-2 pt-2">
          {frequencyGroups.map(group => (
            <Collapsible
              key={group.key}
              open={expandedFrequency === group.key}
              onOpenChange={() => setExpandedFrequency(expandedFrequency === group.key ? null : group.key)}
            >
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedFrequency === group.key ? 'rotate-180' : ''}`} />
                    <span className="text-sm font-medium">{group.label} Clients</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{group.clients.length}</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-1 pl-6">
                  {group.clients.slice(0, 10).map((pattern: any) => (
                    <div key={pattern.id} className="flex items-center justify-between text-sm py-1">
                      <span className="truncate max-w-[180px]">
                        {pattern.client?.company_name || 'Unknown'}
                      </span>
                      {pattern.typical_day_of_week !== null && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {dayNames[pattern.typical_day_of_week]}
                        </span>
                      )}
                    </div>
                  ))}
                  {group.clients.length > 10 && (
                    <div className="text-xs text-muted-foreground py-1">
                      +{group.clients.length - 10} more clients
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
