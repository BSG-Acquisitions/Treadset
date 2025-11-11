import { addDays, format } from "date-fns";
import { usePickups } from "@/hooks/usePickups";
import { useVehicles } from "@/hooks/useVehicles";
import React, { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Calendar, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateManifest } from "@/hooks/useManifests";
import { ReceiverSignatureDialog } from "@/components/ReceiverSignatureDialog";

export type WeeklyPickupsGridProps = {
  currentWeek: Date;
  onMovePickup?: (pickup: any) => void;
};

function DayColumn({ day, onMovePickup }: { day: Date; onMovePickup?: (pickup: any) => void }) {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(day.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${dayOfMonth}`;

  const { data: pickups = [] } = usePickups(dateStr);
  const { data: vehicles = [] } = useVehicles();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pickupToDelete, setPickupToDelete] = useState<any>(null);

  const [receiverDialogOpen, setReceiverDialogOpen] = useState(false);
  const [receiverManifest, setReceiverManifest] = useState<{ id: string; number?: string } | null>(null);
  const [isOpeningReceiver, setIsOpeningReceiver] = useState(false);
  const createManifest = useCreateManifest({ toastOnSuccess: false });

  const openReceiverSignature = async (pickup: any) => {
    try {
      setIsOpeningReceiver(true);

      let manifestId: string | undefined = pickup.manifest_id;
      let manifestNumber: string | undefined = pickup.manifest_number;

      if (!manifestId) {
        const { data: found, error } = await supabase
          .from('manifests')
          .select('id, manifest_number')
          .eq('pickup_id', pickup.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) console.warn('Lookup manifest by pickup_id failed', error);
        if (found) {
          manifestId = found.id;
          manifestNumber = found.manifest_number as string | undefined;
        }
      }

      if (!manifestId) {
        const created = await createManifest.mutateAsync({
          client_id: pickup.client_id,
          location_id: pickup.location_id,
          pickup_id: pickup.id,
        } as any);
        manifestId = created.id;
        manifestNumber = created.manifest_number;
        toast({ title: 'Manifest created', description: 'A manifest was created so receiver can sign.' });
      }

      if (manifestId) {
        setReceiverManifest({ id: manifestId, number: manifestNumber });
        setReceiverDialogOpen(true);
      } else {
        toast({ title: 'Unable to open receiver signature', description: 'Manifest could not be resolved or created.', variant: 'destructive' });
      }
    } catch (e: any) {
      console.error('openReceiverSignature failed', e);
      toast({ title: 'Error', description: e?.message ?? 'Failed to open receiver signature.', variant: 'destructive' });
    } finally {
      setIsOpeningReceiver(false);
    }
  };

  const handleRemovePickup = async (pickup: any) => {
    try {
      // First, unlink any related manifests (set pickup_id to null instead of deleting)
      const { error: manifestError } = await supabase
        .from('manifests')
        .update({ pickup_id: null })
        .eq('pickup_id', pickup.id);

      if (manifestError) console.warn('Error unlinking manifests:', manifestError);

      // Delete any assignments
      const { error: assignmentError } = await supabase
        .from('assignments')
        .delete()
        .eq('pickup_id', pickup.id);

      if (assignmentError) throw assignmentError;

      // Delete the pickup
      const { error: pickupError } = await supabase
        .from('pickups')
        .delete()
        .eq('id', pickup.id);

      if (pickupError) throw pickupError;

      toast({
        title: "Pickup Deleted",
        description: `${pickup.client?.company_name || 'Pickup'} has been removed from all schedules`,
      });

      setPickupToDelete(null);

      // Remove the cached data immediately and refetch
      queryClient.removeQueries({ queryKey: ['pickups', dateStr], exact: true });
      
      // Small delay to ensure database has processed the deletion
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Invalidate all pickup-related queries and force refetch
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pickups'], refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['assignments'] }),
        queryClient.invalidateQueries({ queryKey: ['driver-assignments'] }),
        queryClient.invalidateQueries({ queryKey: ['routes'] }),
        queryClient.invalidateQueries({ queryKey: ['optimized-routes'] }),
        queryClient.invalidateQueries({ queryKey: ['manifests'] }),
      ]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete pickup",
        variant: "destructive",
      });
    }
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
  const isToday = dateStr === todayStr;

  // Group pickups by vehicle
  const pickupsByVehicle = pickups.reduce((acc: any, pickup: any) => {
    const vehicleId = pickup.daily_assignments?.[0]?.vehicle_id || 'unassigned';
    if (!acc[vehicleId]) {
      acc[vehicleId] = [];
    }
    acc[vehicleId].push(pickup);
    return acc;
  }, {});

  return (
    <div className="flex flex-col border-r border-gray-300 last:border-r-0 h-[calc(100vh-220px)] min-h-[700px]">
      {/* Day Header */}
      <div className={`text-center py-4 border-b-2 border-gray-300 flex-shrink-0 ${isToday ? 'bg-[#5b8f4d] text-white' : 'bg-white text-gray-800'}`}>
        <div className={`font-semibold text-base mb-1 ${isToday ? 'text-white' : 'text-gray-900'}`}>
          {format(day, "EEEE")}
        </div>
        <div className={`text-sm ${isToday ? 'text-white' : 'text-gray-600'}`}>
          {format(day, "MMM d yyyy")}
        </div>
      </div>

      {/* Pickups List - Scrollable */}
      <div className="flex-1 bg-[#f5f5f5] p-2 overflow-y-auto min-h-0">
        {pickups.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            {/* Empty state */}
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(pickupsByVehicle).map(([vehicleId, vehiclePickups]: [string, any]) => {
              const vehicle = vehicles.find(v => v.id === vehicleId);
              const driver = vehiclePickups[0]?.daily_assignments?.[0]?.assigned_driver;
              
              return (
                  <div key={vehicleId} className="space-y-3">
                  {(vehiclePickups as any[]).map((pickup: any) => (
                    <div
                      key={pickup.id}
                      className="bg-white rounded border border-gray-300 p-3 hover:shadow-md hover:border-primary transition-all relative cursor-pointer group"
                      onClick={() => onMovePickup?.(pickup)}
                    >
                      {/* Vehicle/Driver Header */}
                      <div className="flex items-center justify-between gap-1.5 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">🚚</span>
                          <span className="text-sm font-medium text-gray-700">
                            {vehicle?.name || 'Truck'} - {driver ? (`${driver.first_name || ''} ${driver.last_name || ''}`.trim() || driver.email) : 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            onMovePickup?.(pickup);
          }}>
            <Calendar className="h-4 w-4 mr-2" />
            Move Pickup
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              openReceiverSignature(pickup);
            }}
            disabled={isOpeningReceiver || createManifest.isPending}
          >
            Receiver Signature
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              setPickupToDelete(pickup);
            }}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove from Route
          </DropdownMenuItem>
        </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Client Name */}
                      <div className="font-bold text-[15px] text-gray-900 mb-1.5 leading-tight">
                        {pickup.client?.company_name || "Unknown Client"}
                      </div>

                      {/* Address */}
                      <div className="text-[13px] text-gray-600 leading-relaxed">
                        {pickup.location?.address || 
                         [
                           pickup.client?.mailing_address,
                           [pickup.client?.city, pickup.client?.state].filter(Boolean).join(', '),
                           pickup.client?.zip,
                         ].filter(Boolean).join(' ') || 
                         'No address'}
                      </div>
                      
                      {/* Hover hint */}
                      <div className="absolute bottom-1 right-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to move
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!pickupToDelete} onOpenChange={() => setPickupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Pickup from Route</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {pickupToDelete?.client?.company_name || 'this pickup'} from the route? This will delete the pickup and any associated assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleRemovePickup(pickupToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Pickup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {receiverManifest && (
        <ReceiverSignatureDialog
          open={receiverDialogOpen}
          onOpenChange={setReceiverDialogOpen}
          manifestId={receiverManifest.id}
          manifestNumber={receiverManifest.number || ''}
        />
      )}
    </div>
  );
}

export function WeeklyPickupsGrid({ currentWeek, onMovePickup }: WeeklyPickupsGridProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  return (
    <div className="grid grid-cols-7 border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm h-[calc(100vh-220px)] min-h-[700px]">
      {weekDays.map((day) => (
        <DayColumn key={day.toISOString()} day={day} onMovePickup={onMovePickup} />
      ))}
    </div>
  );
}
