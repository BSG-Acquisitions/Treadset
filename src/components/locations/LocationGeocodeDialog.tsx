import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, MapPin, RefreshCw } from 'lucide-react';
import { useAllLocations } from '@/hooks/useLocations';
import { useGeocodeLocations } from '@/hooks/useGeocodeLocations';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

export function LocationGeocodeDialog() {
  const [open, setOpen] = useState(false);
  const { data: locations, isLoading, refetch } = useAllLocations();
  const { geocodeLocation, geocodeAllLocations, isLoading: isGeocoding } = useGeocodeLocations();

  const locationsWithoutCoords = locations?.filter(
    (loc) => !loc.latitude || !loc.longitude
  ) || [];

  const locationsWithCoords = locations?.filter(
    (loc) => loc.latitude && loc.longitude
  ) || [];

  const handleGeocodeAll = async () => {
    await geocodeAllLocations();
    await refetch();
  };

  const handleGeocodeOne = async (locationId: string) => {
    await geocodeLocation(locationId, true);
    await refetch();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MapPin className="h-4 w-4 mr-2" />
          Geocode Locations
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Location Geocoding</DialogTitle>
          <DialogDescription>
            Re-geocode locations to fix incorrect coordinates or add coordinates to locations without them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {locationsWithoutCoords.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {locationsWithoutCoords.length} location(s) need geocoding
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Total locations: {locations?.length || 0}
            </p>
            <Button
              onClick={handleGeocodeAll}
              disabled={isGeocoding || locationsWithoutCoords.length === 0}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isGeocoding ? 'animate-spin' : ''}`} />
              Geocode All Missing
            </Button>
          </div>

          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="space-y-4">
              {/* Locations without coordinates */}
              {locationsWithoutCoords.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Missing Coordinates ({locationsWithoutCoords.length})
                  </h4>
                  <div className="space-y-2">
                    {locationsWithoutCoords.map((loc) => (
                      <div
                        key={loc.id}
                        className="flex justify-between items-start p-2 bg-muted/50 rounded"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{loc.name || 'Unnamed'}</p>
                          <p className="text-sm text-muted-foreground">{loc.address}</p>
                          {loc.clients?.company_name && (
                            <p className="text-xs text-muted-foreground">
                              Client: {loc.clients.company_name}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGeocodeOne(loc.id)}
                          disabled={isGeocoding}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${isGeocoding ? 'animate-spin' : ''}`} />
                          Geocode
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Locations with coordinates */}
              {locationsWithCoords.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    With Coordinates ({locationsWithCoords.length})
                  </h4>
                  <div className="space-y-2">
                    {locationsWithCoords.map((loc) => (
                      <div
                        key={loc.id}
                        className="flex justify-between items-start p-2 bg-muted/50 rounded"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{loc.name || 'Unnamed'}</p>
                          <p className="text-sm text-muted-foreground">{loc.address}</p>
                          <p className="text-xs text-muted-foreground">
                            Coordinates: {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                          </p>
                          {loc.clients?.company_name && (
                            <p className="text-xs text-muted-foreground">
                              Client: {loc.clients.company_name}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleGeocodeOne(loc.id)}
                          disabled={isGeocoding}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${isGeocoding ? 'animate-spin' : ''}`} />
                          Re-geocode
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
