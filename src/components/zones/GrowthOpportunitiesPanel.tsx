import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, MapPin, TrendingUp, Target, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface GrowthOpportunity {
  type: 'underserved_zip' | 'expansion' | 'reactivation';
  title: string;
  description: string;
  potentialClients?: number;
  nearbyActiveClients?: number;
  zipCode?: string;
  city?: string;
}

export function GrowthOpportunitiesPanel() {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ['growth-opportunities', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Get all clients with their ZIP codes and pickup counts
      const { data: clients } = await supabase
        .from('clients')
        .select('id, physical_zip, physical_city, is_active')
        .eq('organization_id', organizationId);

      // Get completed pickups grouped by client
      const { data: pickups } = await supabase
        .from('pickups')
        .select('client_id')
        .eq('organization_id', organizationId)
        .eq('status', 'completed');

      // Analyze ZIP code coverage
      const zipCodeStats = new Map<string, { active: number; inactive: number; pickups: number; city: string }>();
      
      (clients || []).forEach(c => {
        if (!c.physical_zip) return;
        const existing = zipCodeStats.get(c.physical_zip) || { active: 0, inactive: 0, pickups: 0, city: c.physical_city || '' };
        if (c.is_active) {
          existing.active++;
        } else {
          existing.inactive++;
        }
        zipCodeStats.set(c.physical_zip, existing);
      });

      // Count pickups per ZIP
      const clientZips = new Map((clients || []).map(c => [c.id, c.physical_zip]));
      (pickups || []).forEach(p => {
        const zip = clientZips.get(p.client_id);
        if (zip) {
          const existing = zipCodeStats.get(zip);
          if (existing) {
            existing.pickups++;
          }
        }
      });

      const opps: GrowthOpportunity[] = [];

      // Find underserved ZIP codes (have clients but low pickup count)
      zipCodeStats.forEach((stats, zip) => {
        if (stats.active >= 2 && stats.pickups < 3) {
          opps.push({
            type: 'underserved_zip',
            title: `Underserved: ${zip}`,
            description: `${stats.active} active clients but only ${stats.pickups} pickups`,
            potentialClients: stats.active,
            zipCode: zip,
            city: stats.city,
          });
        }
      });

      // Find reactivation opportunities (inactive clients)
      const inactiveByZip = Array.from(zipCodeStats.entries())
        .filter(([_, stats]) => stats.inactive >= 2)
        .sort((a, b) => b[1].inactive - a[1].inactive)
        .slice(0, 3);

      inactiveByZip.forEach(([zip, stats]) => {
        opps.push({
          type: 'reactivation',
          title: `Reactivation: ${stats.city || zip}`,
          description: `${stats.inactive} inactive clients could be re-engaged`,
          potentialClients: stats.inactive,
          zipCode: zip,
          city: stats.city,
        });
      });

      // Find expansion opportunities (ZIP codes with only 1 client but neighboring high-activity ZIPs)
      const highActivityZips = Array.from(zipCodeStats.entries())
        .filter(([_, stats]) => stats.pickups >= 5)
        .map(([zip]) => zip);

      zipCodeStats.forEach((stats, zip) => {
        if (stats.active === 1 && stats.pickups >= 1) {
          // Check if nearby ZIP codes are high activity (simple proximity check)
          const zipNum = parseInt(zip);
          const hasNearbyActivity = highActivityZips.some(hz => {
            const hzNum = parseInt(hz);
            return Math.abs(zipNum - hzNum) <= 10; // Within ~10 ZIP codes
          });

          if (hasNearbyActivity) {
            opps.push({
              type: 'expansion',
              title: `Expansion: ${stats.city || zip}`,
              description: `1 client in area with nearby high-activity zones`,
              nearbyActiveClients: highActivityZips.length,
              zipCode: zip,
              city: stats.city,
            });
          }
        }
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
          <p className="text-sm text-muted-foreground mt-1">Add more clients to generate insights</p>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: GrowthOpportunity['type']) => {
    switch (type) {
      case 'underserved_zip': return <Target className="h-4 w-4 text-amber-500" />;
      case 'expansion': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'reactivation': return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getBadgeVariant = (type: GrowthOpportunity['type']) => {
    switch (type) {
      case 'underserved_zip': return 'warning';
      case 'expansion': return 'default';
      case 'reactivation': return 'secondary';
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
                  {opp.city && opp.zipCode && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {opp.city}, {opp.zipCode}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{opp.description}</p>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {opp.type === 'underserved_zip' && 'Underserved'}
                  {opp.type === 'expansion' && 'Expansion'}
                  {opp.type === 'reactivation' && 'Reactivation'}
                </Badge>
                {opp.potentialClients && (
                  <span className="text-xs text-muted-foreground">
                    {opp.potentialClients} potential
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
