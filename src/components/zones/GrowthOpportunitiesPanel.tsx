import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, MapPin, TrendingUp, Target, Users, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

interface GrowthOpportunity {
  type: 'underserved_city' | 'expansion' | 'reactivation' | 'high_performer';
  title: string;
  description: string;
  potentialClients?: number;
  nearbyActiveClients?: number;
  city?: string;
  action?: string;
}

export function GrowthOpportunitiesPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const organizationId = user?.currentOrganization?.id;

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['growth-opportunities', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Get all clients with their city and pickup counts
      const { data: clients } = await supabase
        .from('clients')
        .select('id, physical_city, is_active, last_pickup_at')
        .eq('organization_id', organizationId);

      // Get completed pickups grouped by client
      const { data: pickups } = await supabase
        .from('pickups')
        .select('client_id, computed_revenue')
        .eq('organization_id', organizationId)
        .eq('status', 'completed');

      // Get at-risk clients
      const { data: atRiskClients } = await supabase
        .from('client_risk_scores')
        .select('client_id, risk_level')
        .eq('organization_id', organizationId)
        .in('risk_level', ['high', 'medium']);

      const atRiskSet = new Set((atRiskClients || []).map(r => r.client_id));

      // Analyze city coverage
      const cityStats = new Map<string, { 
        active: number; 
        inactive: number; 
        pickups: number;
        revenue: number;
        atRisk: number;
        lastPickupDaysAgo: number | null;
      }>();
      
      (clients || []).forEach(c => {
        const city = c.physical_city;
        if (!city) return;
        
        const existing = cityStats.get(city) || { 
          active: 0, inactive: 0, pickups: 0, revenue: 0, atRisk: 0, lastPickupDaysAgo: null 
        };
        
        if (c.is_active) {
          existing.active++;
          if (atRiskSet.has(c.id)) {
            existing.atRisk++;
          }
        } else {
          existing.inactive++;
        }

        if (c.last_pickup_at) {
          const days = Math.floor((Date.now() - new Date(c.last_pickup_at).getTime()) / (1000 * 60 * 60 * 24));
          if (existing.lastPickupDaysAgo === null || days < existing.lastPickupDaysAgo) {
            existing.lastPickupDaysAgo = days;
          }
        }
        
        cityStats.set(city, existing);
      });

      // Count pickups and revenue per city
      const clientCityMap = new Map((clients || []).map(c => [c.id, c.physical_city]));
      (pickups || []).forEach(p => {
        const city = clientCityMap.get(p.client_id);
        if (city) {
          const existing = cityStats.get(city);
          if (existing) {
            existing.pickups++;
            existing.revenue += p.computed_revenue || 0;
          }
        }
      });

      const opps: GrowthOpportunity[] = [];

      // Find high-performing cities (for reference)
      const sortedByRevenue = Array.from(cityStats.entries())
        .filter(([_, stats]) => stats.revenue > 0)
        .sort((a, b) => b[1].revenue - a[1].revenue);

      if (sortedByRevenue.length > 0) {
        const [topCity, topStats] = sortedByRevenue[0];
        opps.push({
          type: 'high_performer',
          title: `Top Performer: ${topCity}`,
          description: `${topStats.active} active clients, ${topStats.pickups} pickups`,
          potentialClients: topStats.active,
          city: topCity,
          action: 'view',
        });
      }

      // Find cities with at-risk clients
      const citiesWithRisk = Array.from(cityStats.entries())
        .filter(([_, stats]) => stats.atRisk >= 2)
        .sort((a, b) => b[1].atRisk - a[1].atRisk)
        .slice(0, 2);

      citiesWithRisk.forEach(([city, stats]) => {
        opps.push({
          type: 'underserved_city',
          title: `At-Risk Area: ${city}`,
          description: `${stats.atRisk} at-risk clients need attention`,
          potentialClients: stats.atRisk,
          city,
          action: 'call',
        });
      });

      // Find reactivation opportunities (inactive clients)
      const inactiveByCity = Array.from(cityStats.entries())
        .filter(([_, stats]) => stats.inactive >= 2)
        .sort((a, b) => b[1].inactive - a[1].inactive)
        .slice(0, 2);

      inactiveByCity.forEach(([city, stats]) => {
        opps.push({
          type: 'reactivation',
          title: `Reactivate: ${city}`,
          description: `${stats.inactive} inactive clients could be re-engaged`,
          potentialClients: stats.inactive,
          city,
          action: 'call',
        });
      });

      // Find expansion opportunities (cities with only 1-2 clients but active)
      const expansionCities = Array.from(cityStats.entries())
        .filter(([_, stats]) => stats.active >= 1 && stats.active <= 2 && stats.pickups >= 1)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 2);

      expansionCities.forEach(([city, stats]) => {
        opps.push({
          type: 'expansion',
          title: `Expand in ${city}`,
          description: `${stats.active} active client(s) - potential for growth`,
          nearbyActiveClients: stats.active,
          city,
          action: 'prospect',
        });
      });

      return opps.slice(0, 6);
    },
    enabled: !!organizationId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Analyzing growth opportunities...
        </CardContent>
      </Card>
    );
  }

  if (opportunities.length === 0) {
    return (
      <Card className="border-muted">
        <CardContent className="py-8 text-center">
          <div className="text-muted-foreground">No growth opportunities identified yet</div>
          <p className="text-sm text-muted-foreground mt-1">Add more clients with city data to generate insights</p>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: GrowthOpportunity['type']) => {
    switch (type) {
      case 'underserved_city': return <Target className="h-4 w-4 text-amber-500" />;
      case 'expansion': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'reactivation': return <Lightbulb className="h-4 w-4 text-blue-500" />;
      case 'high_performer': return <Users className="h-4 w-4 text-primary" />;
    }
  };

  const getActionButton = (opp: GrowthOpportunity) => {
    switch (opp.action) {
      case 'call':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/clients', { state: { filterCity: opp.city } })}
          >
            <Phone className="h-3 w-3 mr-1" />
            View Clients
          </Button>
        );
      case 'view':
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/clients', { state: { filterCity: opp.city } })}
          >
            <Users className="h-3 w-3 mr-1" />
            View
          </Button>
        );
      case 'prospect':
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/clients', { state: { filterCity: opp.city } })}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Explore
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Growth Opportunities
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {opportunities.map((opp, index) => (
            <div 
              key={index}
              className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-2 mb-2">
                {getIcon(opp.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{opp.title}</p>
                  {opp.city && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {opp.city}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{opp.description}</p>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {opp.type === 'underserved_city' && 'Needs Attention'}
                  {opp.type === 'expansion' && 'Expansion'}
                  {opp.type === 'reactivation' && 'Reactivation'}
                  {opp.type === 'high_performer' && 'Top Performer'}
                </Badge>
                {getActionButton(opp)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
