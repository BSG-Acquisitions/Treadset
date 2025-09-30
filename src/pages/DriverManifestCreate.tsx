import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building, MapPin, Calendar } from "lucide-react";
import { DriverManifestCreationWizard } from "@/components/driver/DriverManifestCreationWizard";

// Types for pickup data
interface PickupData {
  id: string;
  pickup_date: string;
  status: string;
  clients?: {
    company_name: string;
  };
  locations?: {
    name: string;
  };
}

export default function DriverManifestCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const pickupId = searchParams.get('pickup');
  const clientId = searchParams.get('client');
  
  const [pickup, setPickup] = useState<PickupData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch pickup data
  useEffect(() => {
    const fetchPickup = async () => {
      if (!pickupId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('pickups')
          .select(`
            *,
            clients (company_name),
            locations (name)
          `)
          .eq('id', pickupId)
          .single();

        if (error) throw error;
        setPickup(data);
      } catch (error) {
        console.error('Error fetching pickup:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPickup();
  }, [pickupId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link to="/driver/manifests">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-xl md:text-3xl font-bold">Create Manifest</h1>
            <p className="text-sm text-muted-foreground">Complete the manifest wizard</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          
          {/* Pickup Info Sidebar */}
          {pickup && (
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Pickup Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={pickup.status === 'scheduled' ? 'default' : 'secondary'}>
                    {pickup.status}
                  </Badge>
                </div>
                
                {pickup.clients && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      Client
                    </p>
                    <p className="font-medium">{pickup.clients.company_name}</p>
                  </div>
                )}
                
                {pickup.locations && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Location
                    </p>
                    <p className="text-sm">{pickup.locations.name}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Wizard */}
          <div className="lg:col-span-3">
            <DriverManifestCreationWizard
              pickupId={pickupId || undefined}
              clientId={clientId || undefined}
              onComplete={() => navigate("/driver/manifests")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
