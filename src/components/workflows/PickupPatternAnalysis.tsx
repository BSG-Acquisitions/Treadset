import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClientWorkflows } from '@/hooks/useClientWorkflows';
import { useAnalyzePickupPatterns } from '@/hooks/usePickupPatterns';
import { TrendingUp, Calendar, AlertTriangle, RefreshCw, Phone, Mail } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

export function PickupPatternAnalysis() {
  const { data: workflows = [], isLoading } = useClientWorkflows();
  const analyzePatterns = useAnalyzePickupPatterns();

  // Filter for overdue follow-ups
  const overdueWorkflows = workflows.filter(
    w => w.workflow_type === 'followup' && w.status === 'overdue'
  );

  // Sort by days overdue (most overdue first)
  const sortedOverdue = [...overdueWorkflows].sort((a, b) => {
    const aDays = a.last_contact_date 
      ? Math.floor((Date.now() - new Date(a.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const bDays = b.last_contact_date
      ? Math.floor((Date.now() - new Date(b.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    return bDays - aDays;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading pickup patterns...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Pickup Pattern Analysis
            </CardTitle>
            <CardDescription>
              Clients overdue for pickup based on historical patterns
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => analyzePatterns.mutate()}
            disabled={analyzePatterns.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${analyzePatterns.isPending ? 'animate-spin' : ''}`} />
            {analyzePatterns.isPending ? 'Analyzing...' : 'Refresh Analysis'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedOverdue.length === 0 ? (
          <div className="text-center py-8 bg-muted/20 rounded-lg border-2 border-dashed">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground mb-1">
              All Caught Up!
            </p>
            <p className="text-sm text-muted-foreground">
              No clients are currently overdue for pickup
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => analyzePatterns.mutate()}
              disabled={analyzePatterns.isPending}
            >
              Run Analysis
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedOverdue.map((workflow) => {
              const daysSinceLast = workflow.last_contact_date
                ? Math.floor((Date.now() - new Date(workflow.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
                : null;
              
              const daysOverdue = workflow.contact_frequency_days && daysSinceLast
                ? daysSinceLast - workflow.contact_frequency_days
                : null;

              return (
                <div
                  key={workflow.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Client Name */}
                      <div className="flex items-center gap-2">
                        <Link 
                          to={`/clients/${workflow.client_id}`}
                          className="font-semibold text-lg hover:text-primary transition-colors"
                        >
                          {workflow.clients?.company_name || 'Unknown Client'}
                        </Link>
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Overdue
                        </Badge>
                      </div>

                      {/* Contact Information */}
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {workflow.clients?.phone && (
                          <a 
                            href={`tel:${workflow.clients.phone}`}
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {workflow.clients.phone}
                          </a>
                        )}
                        {workflow.clients?.email && (
                          <a 
                            href={`mailto:${workflow.clients.email}`}
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {workflow.clients.email}
                          </a>
                        )}
                      </div>

                      {/* Pattern Details */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-xs text-muted-foreground">Last Pickup</div>
                            <div className="font-medium">
                              {workflow.last_contact_date 
                                ? formatDistanceToNow(new Date(workflow.last_contact_date), { addSuffix: true })
                                : 'Never'
                              }
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-xs text-muted-foreground">Typical Frequency</div>
                            <div className="font-medium">
                              Every {workflow.contact_frequency_days || '?'} days
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Overdue Status */}
                      {daysOverdue && (
                        <div className="p-2 bg-destructive/10 rounded border border-destructive/20">
                          <p className="text-sm text-destructive font-medium">
                            {daysOverdue} days overdue • Expected pickup was {workflow.next_contact_date ? format(new Date(workflow.next_contact_date), 'MMM d, yyyy') : 'unknown'}
                          </p>
                        </div>
                      )}

                      {/* Notes */}
                      {workflow.notes && (
                        <div className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3">
                          {workflow.notes}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <Button size="sm" asChild>
                        <Link to={`/schedule-pickup?client=${workflow.client_id}`}>
                          Schedule Pickup
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/clients/${workflow.client_id}`}>
                          View Client
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
