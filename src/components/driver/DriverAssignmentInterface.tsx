import { useState, useEffect } from "react";
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
import { CompletePickupDialog } from "../CompletePickupDialog";
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
    pickup_id: string;
    pickup?: {
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
    } | null;
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
  const updateAssignmentStatus = useUpdateAssignmentStatus();
  const { toast } = useToast();

  // Use pickup data with fallback fetch if missing
  const [pickup, setPickup] = useState<DriverAssignmentInterfaceProps['assignment']['pickup']>(assignment.pickup ?? null);

  // Fallback: fetch pickup if nested relation came back null (RLS timing, etc.)
  useEffect(() => {
    const loadPickup = async () => {
      if (!pickup && assignment.pickup_id) {
        const { data, error } = await supabase
          .from('pickups')
          .select(`
            id, client_id, pickup_date, preferred_window, pte_count, otr_count, tractor_count, notes, manifest_id, status,
            client:clients(id, company_name, email),
            location:locations(id, address, name, latitude, longitude)
          `)
          .eq('id', assignment.pickup_id)
          .maybeSingle();
        if (!error && data) setPickup(data as any);
      }
    };
    loadPickup();
  }, [assignment.pickup_id, pickup]);
  
  // Debug logging
  console.log('DriverAssignmentInterface - Assignment:', assignment);
  console.log('DriverAssignmentInterface - Pickup:', pickup);
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

  const handlePickupComplete = () => {
    // Refresh data after completion
    onComplete?.();
  };

  // Show error state if pickup data is missing
  if (!pickup) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-destructive font-medium">Missing Pickup Data</div>
            <div className="text-muted-foreground text-sm mt-2">
              Assignment ID: {assignment.id}<br/>
              Pickup ID: {assignment.pickup_id}<br/>
              This assignment may not have proper pickup data associated with it.
            </div>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="mt-4"
            >
              Refresh Page
            </Button>
          </CardContent>
        </Card>
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
              <div className="font-medium text-lg">{pickup?.client?.company_name || 'Unknown Client'}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {pickup?.location?.address || 'No address available'}
              </div>
              {pickup?.preferred_window && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Preferred: {pickup.preferred_window}
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
                <div className="text-2xl font-bold text-brand-primary">{pickup?.pte_count ?? 0}</div>
                <div className="text-xs text-muted-foreground">PTE Tires</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-primary">{pickup?.otr_count ?? 0}</div>
                <div className="text-xs text-muted-foreground">OTR Tires</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-primary">{pickup?.tractor_count ?? 0}</div>
                <div className="text-xs text-muted-foreground">Tractor Tires</div>
              </div>
            </div>

            {pickup?.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="text-sm font-medium text-yellow-800">Notes:</div>
                <div className="text-sm text-yellow-700">{pickup?.notes}</div>
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

            {(assignment.status === 'in_progress' || assignment.status === 'assigned') && pickup && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Complete Pickup</h4>
                  <p className="text-sm text-muted-foreground">
                    Use the same workflow as admin interface to complete pickup and generate manifest.
                  </p>
                    <CompletePickupDialog
                      pickup={{
                        id: pickup.id,
                        client: pickup.client,
                        location: pickup.location,
                        pickup_date: pickup.pickup_date,
                        pte_count: pickup.pte_count ?? 0,
                        otr_count: pickup.otr_count ?? 0,
                        tractor_count: pickup.tractor_count ?? 0,
                        notes: pickup.notes,
                        status: assignment.status
                      }}
                      trigger={
                        <Button 
                          variant="outline" 
                          className="w-full h-12"
                        >
                          <FileText className="h-5 w-5 mr-2" />
                          Complete Pickup & Generate Manifest
                        </Button>
                      }
                      onSuccess={async (_manifestId, pdfPath) => {
                        try {
                          await updateAssignmentStatus.mutateAsync({
                            assignmentId: assignment.id,
                            status: 'completed',
                            completionData: {
                              manifestUrl: pdfPath ?? null,
                              notes: pickup?.notes ?? null,
                            }
                          });
                          handlePickupComplete();
                        } catch (e) {
                          console.error('Failed to update assignment after completion:', e);
                        }
                      }}
                    />
                </div>
              </>
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