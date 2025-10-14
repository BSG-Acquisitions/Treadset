import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { MapPin, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface LocationTest {
  id: string;
  name: string;
  address: string;
  currentLat: number | null;
  currentLng: number | null;
  newLat?: number;
  newLng?: number;
  distance?: number;
  confidence?: number;
  status: 'pending' | 'testing' | 'success' | 'error';
  error?: string;
}

export default function GeocodingTest() {
  const [locations, setLocations] = useState<LocationTest[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{ success: number; failed: number; improved: number }>({
    success: 0,
    failed: 0,
    improved: 0
  });

  const { data: dbLocations, isLoading } = useQuery({
    queryKey: ['test-locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, address, latitude, longitude')
        .order('name')
        .limit(20);
      
      if (error) throw error;
      
      return data.map(loc => ({
        id: loc.id,
        name: loc.name,
        address: loc.address,
        currentLat: loc.latitude,
        currentLng: loc.longitude,
        status: 'pending' as const
      }));
    }
  });

  const testGeocodingAccuracy = async () => {
    if (!dbLocations) return;
    
    setIsTesting(true);
    setLocations(dbLocations);
    
    let success = 0;
    let failed = 0;
    let improved = 0;

    for (let i = 0; i < dbLocations.length; i++) {
      const location = dbLocations[i];
      
      setLocations(prev => prev.map((loc, idx) => 
        idx === i ? { ...loc, status: 'testing' as const } : loc
      ));

      try {
        const { data, error } = await supabase.functions.invoke('geocode-locations', {
          body: { locationId: location.id, forceUpdate: true }
        });

        if (error) throw error;

        const newLat = data.location.latitude;
        const newLng = data.location.longitude;
        const confidence = data.location.confidence;
        
        // Calculate distance between old and new coordinates if both exist
        let distance = 0;
        if (location.currentLat && location.currentLng) {
          distance = calculateDistance(
            location.currentLat,
            location.currentLng,
            newLat,
            newLng
          );
          if (distance > 5) improved++; // Improved if moved more than 5 miles
        }

        setLocations(prev => prev.map((loc, idx) =>
          idx === i ? {
            ...loc,
            newLat,
            newLng,
            distance,
            confidence,
            status: 'success' as const
          } : loc
        ));
        
        success++;
      } catch (error: any) {
        setLocations(prev => prev.map((loc, idx) =>
          idx === i ? {
            ...loc,
            status: 'error' as const,
            error: error.message
          } : loc
        ));
        failed++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    setTestResults({ success, failed, improved });
    setIsTesting(false);
    toast.success(`Test complete: ${success} succeeded, ${failed} failed, ${improved} improved`);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    if (confidence >= 80) return <Badge variant="default" className="bg-green-600">High ({confidence}%)</Badge>;
    if (confidence >= 60) return <Badge variant="secondary">Medium ({confidence}%)</Badge>;
    return <Badge variant="destructive">Low ({confidence}%)</Badge>;
  };

  const getDistanceBadge = (distance?: number) => {
    if (!distance) return <Badge variant="outline">New</Badge>;
    if (distance < 1) return <Badge variant="default" className="bg-green-600">Accurate</Badge>;
    if (distance < 10) return <Badge variant="secondary">Good</Badge>;
    if (distance < 50) return <Badge className="bg-orange-600">Adjusted</Badge>;
    return <Badge variant="destructive">Fixed ({distance.toFixed(0)}mi)</Badge>;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading locations...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Geocoding Accuracy Test
          </CardTitle>
          <CardDescription>
            Test Mapbox geocoding accuracy for all locations. This will re-geocode each location and compare results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div className="text-sm">
                <span className="font-medium">Total Locations:</span> {dbLocations?.length || 0}
              </div>
              {testResults.success > 0 && (
                <>
                  <div className="text-sm text-green-600">
                    <CheckCircle2 className="inline h-4 w-4 mr-1" />
                    Success: {testResults.success}
                  </div>
                  <div className="text-sm text-red-600">
                    <XCircle className="inline h-4 w-4 mr-1" />
                    Failed: {testResults.failed}
                  </div>
                  <div className="text-sm text-orange-600">
                    <AlertTriangle className="inline h-4 w-4 mr-1" />
                    Improved: {testResults.improved}
                  </div>
                </>
              )}
            </div>
            <Button
              onClick={testGeocodingAccuracy}
              disabled={isTesting || !dbLocations}
            >
              {isTesting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Run Geocoding Test
                </>
              )}
            </Button>
          </div>

          {locations.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Old Coords</TableHead>
                    <TableHead>New Coords</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((loc) => (
                    <TableRow key={loc.id}>
                      <TableCell>
                        {loc.status === 'pending' && <Badge variant="outline">Pending</Badge>}
                        {loc.status === 'testing' && (
                          <Badge variant="secondary">
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                            Testing
                          </Badge>
                        )}
                        {loc.status === 'success' && (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Success
                          </Badge>
                        )}
                        {loc.status === 'error' && (
                          <Badge variant="destructive">
                            <XCircle className="mr-1 h-3 w-3" />
                            Error
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{loc.name}</TableCell>
                      <TableCell className="text-sm">{loc.address}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {loc.currentLat && loc.currentLng
                          ? `${loc.currentLat.toFixed(4)}, ${loc.currentLng.toFixed(4)}`
                          : 'None'}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {loc.newLat && loc.newLng
                          ? `${loc.newLat.toFixed(4)}, ${loc.newLng.toFixed(4)}`
                          : '-'}
                      </TableCell>
                      <TableCell>{getDistanceBadge(loc.distance)}</TableCell>
                      <TableCell>{getConfidenceBadge(loc.confidence)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
