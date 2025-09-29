import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSchedulePickupWithDriver } from "@/hooks/useSchedulePickupWithDriver";
import { useClients } from "@/hooks/useClients";
import { useLocations } from "@/hooks/useLocations";
import { useVehicles } from "@/hooks/useVehicles";
import { useHaulers } from "@/hooks/useHaulers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarIcon, Check, ChevronsUpDown, Truck, Building, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const scheduleWithDriverSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  locationId: z.string().optional(),
  truckSelection: z.string().min(1, "Truck/Hauler is required"),
  pickupDate: z.date({
    required_error: "Pickup date is required",
  }),
  pteCount: z.number().min(0, "PTE count must be 0 or greater").max(10000, "PTE count seems too high"),
  otrCount: z.number().min(0, "OTR count must be 0 or greater").max(10000, "OTR count seems too high"),
  tractorCount: z.number().min(0, "Tractor count must be 0 or greater").max(10000, "Tractor count seems too high"),
  preferredWindow: z.enum(["AM", "PM", "Any"]),
  notes: z.string().optional(),
});

type ScheduleWithDriverFormData = z.infer<typeof scheduleWithDriverSchema>;

interface SchedulePickupWithDriverDialogProps {
  trigger: React.ReactNode;
  defaultClientId?: string;
}

export function SchedulePickupWithDriverDialog({ trigger, defaultClientId }: SchedulePickupWithDriverDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(defaultClientId || "");
  const [clientSearch, setClientSearch] = useState("");
  const [clientComboOpen, setClientComboOpen] = useState(false);
  
  const { data: clients } = useClients({ search: clientSearch, limit: 100 });
  const { data: locations } = useLocations(selectedClientId);
  const { data: vehicles } = useVehicles();
  const { data: haulers } = useHaulers();
  const schedulePickup = useSchedulePickupWithDriver();

  // Combine vehicles and haulers into one unified list
  const allTrucks = [
    ...(vehicles?.map(v => ({
      id: `vehicle-${v.id}`,
      type: 'vehicle' as const,
      name: v.name,
      details: v.license_plate ? `${v.license_plate} • Capacity: ${v.capacity} tires` : `Capacity: ${v.capacity} tires`,
      driverInfo: v.driver_email || 'No driver assigned',
      vehicleId: v.id,
      assignedDriverId: v.assigned_driver_id,
    })) || []),
    ...(haulers?.map(h => ({
      id: `hauler-${h.id}`,
      type: 'hauler' as const,
      name: h.hauler_name,
      details: [h.hauler_mi_reg && `Reg: ${h.hauler_mi_reg}`, h.hauler_phone && `Phone: ${h.hauler_phone}`].filter(Boolean).join(' • '),
      driverInfo: 'External Hauler',
      haulerId: h.id,
    })) || []),
  ];

  const form = useForm<ScheduleWithDriverFormData>({
    resolver: zodResolver(scheduleWithDriverSchema),
    defaultValues: {
      clientId: defaultClientId || "",
      locationId: "",
      truckSelection: "",
      pickupDate: new Date(),
      pteCount: 0,
      otrCount: 0,
      tractorCount: 0,
      preferredWindow: "Any",
      notes: "",
    },
  });

  const onSubmit = async (data: ScheduleWithDriverFormData) => {
    try {
      // Parse the truck selection to determine if it's a vehicle or hauler
      const selectedTruck = allTrucks.find(t => t.id === data.truckSelection);
      
      if (!selectedTruck) {
        throw new Error('Selected truck not found');
      }

      const isVehicle = selectedTruck.type === 'vehicle';
      
      await schedulePickup.mutateAsync({
        clientId: data.clientId,
        locationId: data.locationId,
        vehicleId: isVehicle ? selectedTruck.vehicleId : undefined,
        haulerId: !isVehicle ? selectedTruck.haulerId : undefined,
        driverId: isVehicle && selectedTruck.assignedDriverId ? selectedTruck.assignedDriverId : '',
        pickupDate: format(data.pickupDate, 'yyyy-MM-dd'),
        pteCount: data.pteCount,
        otrCount: data.otrCount,
        tractorCount: data.tractorCount,
        preferredWindow: data.preferredWindow,
        notes: data.notes,
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Failed to schedule pickup with driver:', error);
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    form.setValue("clientId", clientId);
    form.setValue("locationId", ""); // Reset location when client changes
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Schedule Pickup with Truck Assignment
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Client Selection */}
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Client</FormLabel>
                  <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {field.value
                              ? clients?.data?.find((client) => client.id === field.value)?.company_name
                              : "Select client..."}
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                       <PopoverContent className="w-full p-0 z-50 bg-popover" align="start">
                         <Command>
                           <CommandInput
                             placeholder="Search clients..."
                             value={clientSearch}
                             onValueChange={setClientSearch}
                           />
                           <CommandList>
                             <CommandEmpty>No clients found.</CommandEmpty>
                             <CommandGroup>
                               {clients?.data?.map((client) => (
                                 <CommandItem
                                   key={client.id}
                                   value={client.id}
                                   onSelect={() => {
                                     handleClientChange(client.id);
                                     setClientComboOpen(false);
                                   }}
                                 >
                                   <Check
                                     className={cn(
                                       "mr-2 h-4 w-4",
                                       client.id === field.value ? "opacity-100" : "opacity-0"
                                     )}
                                   />
                                   <div>
                                     <div className="font-medium">{client.company_name}</div>
                                     {client.contact_name && (
                                       <div className="text-sm text-muted-foreground">{client.contact_name}</div>
                                     )}
                                   </div>
                                 </CommandItem>
                               ))}
                             </CommandGroup>
                           </CommandList>
                         </Command>
                       </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location Selection */}
            {selectedClientId && (
              <FormField
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location (optional)" />
                        </SelectTrigger>
                      </FormControl>
                       <SelectContent className="z-50 bg-popover">
                         {locations?.map((location) => (
                           <SelectItem key={location.id} value={location.id}>
                             <div>
                               <div className="font-medium">{location.name || location.address}</div>
                               {location.name && (
                                 <div className="text-sm text-muted-foreground">{location.address}</div>
                               )}
                             </div>
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Unified Truck/Hauler Selection */}
            <FormField
              control={form.control}
              name="truckSelection"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Truck or Hauler</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select truck or hauler" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="z-50 bg-popover">
                      {allTrucks.map((truck) => (
                        <SelectItem key={truck.id} value={truck.id}>
                          <div className="flex items-center gap-2">
                            {truck.type === 'vehicle' ? (
                              <Truck className="h-4 w-4 text-primary" />
                            ) : (
                              <Building className="h-4 w-4 text-secondary" />
                            )}
                            <div>
                              <div className="font-medium">{truck.name}</div>
                              {truck.details && (
                                <div className="text-sm text-muted-foreground">{truck.details}</div>
                              )}
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <User className="h-3 w-3" />
                                {truck.driverInfo}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pickupDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Pickup Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`w-full pl-3 text-left font-normal ${
                              !field.value && "text-muted-foreground"
                            }`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                         <CalendarComponent
                           mode="single"
                           selected={field.value}
                           onSelect={field.onChange}
                           disabled={(date) => {
                             const today = new Date();
                             today.setHours(0, 0, 0, 0);
                             return date < today;
                           }}
                           initialFocus
                           className={cn("p-3 pointer-events-auto")}
                         />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredWindow"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Time</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                       <SelectContent className="z-50 bg-popover">
                         <SelectItem value="AM">Morning (AM)</SelectItem>
                         <SelectItem value="PM">Afternoon (PM)</SelectItem>
                         <SelectItem value="Any">Any Time</SelectItem>
                       </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tire Counts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="pteCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PTE Tires</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="otrCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OTR Tires</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tractorCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tractor Tires</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any special instructions or notes..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={schedulePickup.isPending}>
                {schedulePickup.isPending ? "Scheduling..." : "Schedule with Driver"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}