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
  console.log('DriverAssignmentInterface - Location data:', pickup?.location);
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
    <div className="max-w-3xl mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6">
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
            {/* Shop Information */}
            <div className="bg-card rounded-xl p-4 md:p-6 border shadow-sm space-y-4">
              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {pickup?.client?.company_name || 'Unknown Shop'}
                </h2>
                <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'} className="text-base px-4 py-2">
                  {assignment.status === 'completed' ? 'Completed' : 
                   assignment.status === 'in_progress' ? 'In Progress' : 'Assigned'}
                </Badge>
              </div>

              {/* Address - Most Important for Drivers */}
              <div className="p-4 md:p-5 bg-blue-50 rounded-xl border-2 border-blue-200">
                <div className="flex items-start gap-3">
                  <MapPin className="h-6 w-6 md:h-7 md:w-7 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="text-sm md:text-base font-medium text-blue-800 mb-2">Complete Address:</div>
                     <div className="text-lg md:text-xl font-bold text-blue-900 leading-relaxed">
                       {/* Show actual address if available, otherwise show what we have */}
                       {pickup?.location?.address && pickup.location.address !== pickup?.location?.name 
                         ? pickup.location.address 
                         : `${pickup?.client?.company_name || 'Customer'} - Full address needed`}
                     </div>
                     {pickup?.location?.name && pickup?.location?.name !== pickup?.location?.address && (
                       <div className="text-base font-medium text-blue-800 mt-1">
                         Location Reference: {pickup.location.name}
                       </div>
                     )}
                  </div>
                </div>
              </div>

              {/* Preferred Time */}
              {pickup?.preferred_window && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Preferred Time: </span>
                    <span className="text-base font-semibold text-gray-900">{pickup.preferred_window}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Vehicle Assignment */}
            {assignment.vehicle && (
              <div className="bg-card rounded-xl p-4 md:p-6 border shadow-sm">
                <div className="flex items-center gap-4">
                  <Truck className="h-6 w-6 md:h-8 md:w-8 text-gray-600" />
                  <div>
                    <div className="text-sm md:text-base font-medium text-gray-700 mb-1">Your Vehicle:</div>
                    <div className="text-xl md:text-2xl font-bold text-gray-900">{assignment.vehicle.name}</div>
                    {assignment.vehicle.license_plate && (
                      <div className="text-sm md:text-base text-gray-600 mt-1">
                        License: {assignment.vehicle.license_plate}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Expected Tire Counts */}
            <div className="bg-card rounded-xl p-4 md:p-6 border shadow-sm">
              <h3 className="text-lg md:text-xl font-semibold text-foreground mb-4 text-center">Expected Pickup</h3>
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                <div className="text-center p-3 md:p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="text-2xl md:text-3xl font-bold text-green-700">{pickup?.pte_count ?? 0}</div>
                  <div className="text-sm md:text-base text-green-600 font-medium">PTE Tires</div>
                </div>
                <div className="text-center p-3 md:p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="text-2xl md:text-3xl font-bold text-orange-700">{pickup?.otr_count ?? 0}</div>
                  <div className="text-sm md:text-base text-orange-600 font-medium">OTR Tires</div>
                </div>
                <div className="text-center p-3 md:p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="text-2xl md:text-3xl font-bold text-purple-700">{pickup?.tractor_count ?? 0}</div>
                  <div className="text-sm md:text-base text-purple-600 font-medium">Tractor Tires</div>
                </div>
              </div>
            </div>

            {/* Special Notes */}
            {pickup?.notes && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 md:p-5">
                <div className="text-base md:text-lg font-semibold text-yellow-800 mb-2">Special Instructions:</div>
                <div className="text-base md:text-lg text-yellow-700 leading-relaxed">{pickup.notes}</div>
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
          <div className="space-y-3 md:space-y-4">
            {assignment.status === 'assigned' && (
              <Button 
                onClick={handleStartRoute} 
                className="w-full h-12 md:h-14 text-base md:text-lg font-medium"
                disabled={updateAssignmentStatus.isPending}
              >
                <Play className="h-5 w-5 mr-2" />
                Start This Route
              </Button>
            )}

            {(assignment.status === 'in_progress' || assignment.status === 'assigned') && pickup && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium text-lg">Complete Pickup</h4>
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
                          className="w-full h-12 md:h-14 text-base border-2"
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