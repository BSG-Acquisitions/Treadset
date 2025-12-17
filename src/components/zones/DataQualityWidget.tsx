import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertTriangle, XCircle, MapPin, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useBackfillGeography } from '@/hooks/useBackfillGeography';
import { useGeocodeLocations } from '@/hooks/useGeocodeLocations';

interface DataQualityStats {
  totalClients: number;
  clientsWithCity: number;
  clientsWithZip: number;
  locationsTotal: number;
  locationsWithCoords: number;
  locationsMissingCoords: number;
  clientsNoLocation: number;
}

export function DataQualityWidget() {
  const queryClient = useQueryClient();
  const { runBackfill, isLoading: isBackfilling } = useBackfillGeography();
  const { geocodeAllLocations, isLoading: isGeocoding } = useGeocodeLocations();
  const [isFixingAll, setIsFixingAll] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['data-quality-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) return null;

      const { data: orgRole } = await supabase
        .from('user_organization_roles')
        .select('organization_id')
        .eq('user_id', userData.id)
        .single();

      if (!orgRole) return null;

      // Get client stats - check BOTH city/zip AND physical_city/physical_zip
      const { data: clients } = await supabase
        .from('clients')
        .select('id, city, zip, physical_city, physical_zip')
        .eq('organization_id', orgRole.organization_id)
        .eq('is_active', true);

      // Get location stats
      const { data: locations } = await supabase
        .from('locations')
        .select('id, latitude, longitude, address, client_id')
        .eq('organization_id', orgRole.organization_id);

      // Get clients with locations
      const clientsWithLocations = new Set(locations?.map(l => l.client_id) || []);

      const totalClients = clients?.length || 0;
      // Check EITHER physical_city OR city field
      const clientsWithCity = clients?.filter(c => c.physical_city || c.city).length || 0;
      const clientsWithZip = clients?.filter(c => c.physical_zip || c.zip).length || 0;
      const locationsTotal = locations?.length || 0;
      const locationsWithCoords = locations?.filter(l => l.latitude && l.longitude).length || 0;
      const locationsMissingCoords = locations?.filter(l => l.address && (!l.latitude || !l.longitude)).length || 0;
      // Only count as "no location" if they have NO address data anywhere (no location AND no city/zip on client)
      const clientsNoLocation = clients?.filter(c => 
        !clientsWithLocations.has(c.id) && !c.physical_city && !c.city && !c.physical_zip && !c.zip
      ).length || 0;

      return {
        totalClients,
        clientsWithCity,
        clientsWithZip,
        locationsTotal,
        locationsWithCoords,
        locationsMissingCoords,
        clientsNoLocation
      } as DataQualityStats;
    }
  });

  const handleFixAll = async () => {
    setIsFixingAll(true);
    try {
      // Step 1: Forward geocode locations missing coordinates
      if (stats && stats.locationsMissingCoords > 0) {
        toast.info(`Geocoding ${stats.locationsMissingCoords} locations with missing coordinates...`);
        await geocodeAllLocations();
      }

      // Step 2: Run geography backfill with larger batch
      toast.info('Backfilling client geographic data...');
      await runBackfill({ batchSize: 250 });

      // Refresh stats
      queryClient.invalidateQueries({ queryKey: ['data-quality-stats'] });
      toast.success('Geographic data fix complete!');
    } catch (error: any) {
      toast.error('Failed to fix geographic data: ' + error.message);
    } finally {
      setIsFixingAll(false);
    }
  };

  const handleGeocodeOnly = async () => {
    try {
      await geocodeAllLocations();
      queryClient.invalidateQueries({ queryKey: ['data-quality-stats'] });
    } catch (error: any) {
      toast.error('Failed to geocode locations: ' + error.message);
    }
  };

  const handleBackfillOnly = async () => {
    try {
      await runBackfill({ batchSize: 250 });
      queryClient.invalidateQueries({ queryKey: ['data-quality-stats'] });
    } catch (error: any) {
      toast.error('Failed to backfill geography: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const cityPercentage = stats.totalClients > 0 
    ? Math.round((stats.clientsWithCity / stats.totalClients) * 100) 
    : 0;
  const coordsPercentage = stats.locationsTotal > 0 
    ? Math.round((stats.locationsWithCoords / stats.locationsTotal) * 100) 
    : 0;

  const overallHealth = Math.round((cityPercentage + coordsPercentage) / 2);
  const healthColor = overallHealth >= 80 ? 'text-green-500' : overallHealth >= 50 ? 'text-yellow-500' : 'text-red-500';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Geographic Data Quality
          </span>
          <Badge variant={overallHealth >= 80 ? 'default' : overallHealth >= 50 ? 'secondary' : 'destructive'}>
            {overallHealth}% Complete
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client City Data */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Clients with city data</span>
            <span className="font-medium">{stats.clientsWithCity} / {stats.totalClients}</span>
          </div>
          <Progress value={cityPercentage} className="h-2" />
        </div>

        {/* Location Coordinates */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Locations with coordinates</span>
            <span className="font-medium">{stats.locationsWithCoords} / {stats.locationsTotal}</span>
          </div>
          <Progress value={coordsPercentage} className="h-2" />
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <CheckCircle className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <p className="text-xs text-muted-foreground">Complete</p>
            <p className="font-semibold">{stats.clientsWithCity}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <AlertTriangle className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
            <p className="text-xs text-muted-foreground">Need Geocoding</p>
            <p className="font-semibold">{stats.locationsMissingCoords}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <XCircle className="h-4 w-4 mx-auto text-red-500 mb-1" />
            <p className="text-xs text-muted-foreground">No Location</p>
            <p className="font-semibold">{stats.clientsNoLocation}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <Button 
            onClick={handleFixAll} 
            disabled={isFixingAll || isBackfilling || isGeocoding}
            className="w-full"
          >
            {isFixingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fixing Geographic Data...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Fix All Geographic Data
              </>
            )}
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleGeocodeOnly}
              disabled={isGeocoding || isFixingAll || stats.locationsMissingCoords === 0}
            >
              {isGeocoding ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : null}
              Geocode Locations
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBackfillOnly}
              disabled={isBackfilling || isFixingAll}
            >
              {isBackfilling ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : null}
              Backfill Cities
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
