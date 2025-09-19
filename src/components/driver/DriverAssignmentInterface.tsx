import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Truck, 
  MapPin, 
  Clock, 
  FileText, 
  CheckCircle2,
  Play,
  Navigation
} from "lucide-react";
import { ManifestWizard } from "./ManifestWizard";
import { useUpdateAssignmentStatus } from "@/hooks/useDriverWorkflow";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DriverAssignmentInterfaceProps {
  assignment: {
    id: string;
    status: string;
    driver_id?: string;
    organization_id?: string;
    estimated_arrival?: string;
    actual_arrival?: string;
    pickup: {
      id: string;
      client_id: string;
      pickup_date: string;
      preferred_window?: string;
      pte_count: number;
      otr_count: number;
      tractor_count: number;
      notes?: string;
      manifest_id?: string;
      client?: { 
        id: string;
        company_name: string; 
        email?: string;
      };
      location?: { 
        id: string;
        name?: string; 
        address: string;
        latitude?: number;
        longitude?: number;
      };
    };
    vehicle?: {
      id: string;
      name: string;
      capacity?: number;
      license_plate?: string;
    };
  };
  onComplete?: () => void;
}

export function DriverAssignmentInterface({ assignment, onComplete }: DriverAssignmentInterfaceProps) {
  const [showManifestWizard, setShowManifestWizard] = useState(false);
  const [manifestId, setManifestId] = useState<string | null>(assignment.pickup.manifest_id || null);
  const updateAssignmentStatus = useUpdateAssignmentStatus();
  const { toast } = useToast();

  const handleStartRoute = async () => {
    try {
      await updateAssignmentStatus.mutateAsync({
        assignmentId: assignment.id,
        status: 'in_progress'
      });
      
      toast({
        title: "Route Started",
        description: "You've started working on this pickup."
      });
    } catch (error) {
      console.error('Failed to start route:', error);
    }
  };

  const handleCreateManifest = async () => {
    try {
      // Create a new manifest for this pickup
      const { data: newManifest, error } = await supabase
        .from('manifests')
        .insert({
          pickup_id: assignment.pickup.id,
          client_id: assignment.pickup.client_id,
          organization_id: assignment.organization_id,
          driver_id: assignment.driver_id,
          status: 'DRAFT',
          manifest_number: `MAN-${Date.now()}`,
        })
        .select()
        .single();

      if (error) throw error;

      // Update pickup with manifest_id
      await supabase
        .from('pickups')
        .update({ manifest_id: newManifest.id })
        .eq('id', assignment.pickup.id);

      setManifestId(newManifest.id);
      setShowManifestWizard(true);
    } catch (error) {
      console.error('Failed to create manifest:', error);
      toast({
        title: "Error",
        description: "Failed to create manifest. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleManifestComplete = () => {
    setShowManifestWizard(false);
    onComplete?.();
  };

  if (showManifestWizard && manifestId) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Button 
          variant="outline" 
          onClick={() => setShowManifestWizard(false)}
          className="mb-4"
        >
          ← Back to Assignment
        </Button>
        <ManifestWizard 
          manifestId={manifestId}
          onComplete={handleManifestComplete}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Assignment Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-brand-primary" />
            Assignment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Client Info */}
            <div className="bg-secondary/20 rounded-lg p-4">
              <div className="font-medium text-lg">{assignment.pickup.client?.company_name}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {assignment.pickup.location?.address}
              </div>
              {assignment.pickup.preferred_window && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Preferred: {assignment.pickup.preferred_window}
                </div>
              )}
              <div className="mt-2">
                <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'}>
                  {assignment.status}
                </Badge>
              </div>
            </div>

            {/* Vehicle Info */}
            {assignment.vehicle && (
              <div className="bg-secondary/20 rounded-lg p-4">
                <div className="font-medium">{assignment.vehicle.name}</div>
                {assignment.vehicle.license_plate && (
                  <div className="text-sm text-muted-foreground">
                    License: {assignment.vehicle.license_plate}
                  </div>
                )}
                {assignment.vehicle.capacity && (
                  <div className="text-sm text-muted-foreground">
                    Capacity: {assignment.vehicle.capacity} units
                  </div>
                )}
              </div>
            )}

            {/* Expected Counts */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-primary">{assignment.pickup.pte_count}</div>
                <div className="text-xs text-muted-foreground">PTE Tires</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-primary">{assignment.pickup.otr_count}</div>
                <div className="text-xs text-muted-foreground">OTR Tires</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-primary">{assignment.pickup.tractor_count}</div>
                <div className="text-xs text-muted-foreground">Tractor Tires</div>
              </div>
            </div>

            {assignment.pickup.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="text-sm font-medium text-yellow-800">Notes:</div>
                <div className="text-sm text-yellow-700">{assignment.pickup.notes}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assignment.status === 'assigned' && (
              <Button 
                onClick={handleStartRoute} 
                className="w-full h-12 text-lg"
                disabled={updateAssignmentStatus.isPending}
              >
                <Play className="h-5 w-5 mr-2" />
                Start This Route
              </Button>
            )}

            {(assignment.status === 'in_progress' || assignment.status === 'assigned') && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Create Manifest</h4>
                  <p className="text-sm text-muted-foreground">
                    Complete the pickup with signatures and generate the official manifest.
                  </p>
                  <Button 
                    onClick={handleCreateManifest}
                    variant="outline" 
                    className="w-full h-12"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    {manifestId ? 'Continue Manifest' : 'Create New Manifest'}
                  </Button>
                </div>
              </>
            )}

            {manifestId && (
              <Button 
                onClick={() => setShowManifestWizard(true)}
                variant="outline" 
                className="w-full"
              >
                <FileText className="h-5 w-5 mr-2" />
                Open Manifest Wizard
              </Button>
            )}

            {assignment.status === 'completed' && (
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-green-800 font-medium">Route Completed!</div>
                <div className="text-green-600 text-sm">Great job finishing this pickup.</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}