import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, Calendar, ExternalLink, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface AtRiskClient {
  id: string;
  companyName: string;
  phone: string | null;
  city: string | null;
  zip: string | null;
  riskLevel: 'high' | 'medium';
  riskScore: number;
  lastPickupDate: string | null;
  daysSinceLastPickup: number | null;
}

export function AtRiskClientsPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const organizationId = user?.currentOrganization?.id;

  const { data: atRiskClients = [], isLoading } = useQuery({
    queryKey: ['at-risk-clients-zone', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Get at-risk clients with their details
      const { data: riskScores } = await supabase
        .from('client_risk_scores')
        .select(`
          client_id,
          risk_level,
          risk_score,
          clients (
            id,
            company_name,
            phone,
            physical_city,
            physical_zip,
            last_pickup_at
          )
        `)
        .eq('organization_id', organizationId)
        .in('risk_level', ['high', 'medium'])
        .order('risk_score', { ascending: false })
        .limit(10);

      if (!riskScores) return [];

      return riskScores.map(r => {
        const client = r.clients as any;
        const lastPickup = client?.last_pickup_at ? new Date(client.last_pickup_at) : null;
        const daysSince = lastPickup 
          ? Math.floor((Date.now() - lastPickup.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          id: r.client_id,
          companyName: client?.company_name || 'Unknown',
          phone: client?.phone,
          city: client?.physical_city,
          zip: client?.physical_zip,
          riskLevel: r.risk_level as 'high' | 'medium',
          riskScore: r.risk_score,
          lastPickupDate: client?.last_pickup_at,
          daysSinceLastPickup: daysSince,
        };
      });
    },
    enabled: !!organizationId,
  });

  const handleViewClient = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  const handleSchedulePickup = (clientId: string, clientName: string) => {
    navigate('/routes-today', { state: { scheduleClientId: clientId, scheduleClientName: clientName } });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading at-risk clients...
        </CardContent>
      </Card>
    );
  }

  if (atRiskClients.length === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-8 text-center">
          <div className="text-green-600 font-medium">✓ No at-risk clients detected</div>
          <p className="text-sm text-muted-foreground mt-1">All clients are engaged and healthy</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-destructive">
          <AlertTriangle className="h-5 w-5" />
          At-Risk Clients ({atRiskClients.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {atRiskClients.map((client) => (
            <div 
              key={client.id} 
              className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{client.companyName}</span>
                  <Badge 
                    variant={client.riskLevel === 'high' ? 'destructive' : 'outline'}
                    className="text-xs shrink-0"
                  >
                    {client.riskLevel === 'high' ? 'High Risk' : 'Medium Risk'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {client.city && <span>{client.city}</span>}
                  {client.daysSinceLastPickup !== null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {client.daysSinceLastPickup} days since pickup
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {client.phone && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`tel:${client.phone}`}>
                      <Phone className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleSchedulePickup(client.id, client.companyName)}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Schedule
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleViewClient(client.id)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
