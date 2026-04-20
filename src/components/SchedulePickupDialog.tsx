import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSchedulePickup } from "@/hooks/usePickups";
import { useClients } from "@/hooks/useClients";
import { useLocations } from "@/hooks/useLocations";
import { useVehicles } from "@/hooks/useVehicles";
import { useHaulers } from "@/hooks/useHaulers";
import { useDrivers } from "@/hooks/useDrivers";
import { SchedulePickupWithDriverDialog } from "./SchedulePickupWithDriverDialog";
import { useToast } from "@/hooks/use-toast";
import { useNearbySuggestions } from "@/hooks/useNearbySuggestions";
import { NearbyClientSuggestions } from "./NearbyClientSuggestions";
import { useAuth } from "@/contexts/AuthContext";
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
import { CalendarIcon, Check, ChevronsUpDown, Truck, User, Building } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const scheduleSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  locationId: z.string().optional(),
  pickupDate: z.date({
    required_error: "Pickup date is required",
  }),
  pteCount: z.number().min(0).default(0),
  otrCount: z.number().min(0).default(0),
  tractorCount: z.number().min(0).default(0),
  preferredWindow: z.enum(["AM", "PM", "Any"]).default("Any"),
  truckSelection: z.string().min(1, "Truck/Hauler is required"),
  driverId: z.string().optional(),
  notes: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface SchedulePickupDialogProps {
  trigger: React.ReactNode;
  defaultClientId?: string;
}

export function SchedulePickupDialog({ trigger, defaultClientId }: SchedulePickupDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(defaultClientId || "");
  const [clientSearch, setClientSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [driverComboOpen, setDriverComboOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [scheduledClientName, setScheduledClientName] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const { suggestNearby, isLoading: isSuggestionsLoading } = useNearbySuggestions();
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(clientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);
  
  const { data: clients } = useClients({ search: debouncedSearch, limit: 100 });
  const { data: locations } = useLocations(selectedClientId);
  const { data: vehicles } = useVehicles();
  const { data: haulers } = useHaulers();
  const { data: drivers, refetch: refetchDrivers } = useDrivers();
  const schedulePickup = useSchedulePickup();

  // Combine vehicles and haulers into one unified list
  const allTrucks = [
    ...(vehicles?.map(v => ({
      id: `vehicle-${v.id}`,
      type: 'vehicle' as const,
      name: v.name,
      details: v.license_plate ? `${v.license_plate} • Capacity: ${v.capacity} tires` : `Capacity: ${v.capacity} tires`,
      driverInfo: v.driver_email || (v.assigned_driver_id ? 'Driver assigned' : null),
      vehicleId: v.id,
      assignedDriverId: v.assigned_driver_id,
    })) || []),
    ...(haulers?.map(h => ({
      id: `hauler-${h.id}`,
      type: 'hauler' as const,
      name: h.company_name,
      details: [h.hauler_mi_reg && `Reg: ${h.hauler_mi_reg}`, h.phone && `Phone: ${h.phone}`].filter(Boolean).join(' • '),
      driverInfo: 'External Hauler',
      haulerId: h.id,
    })) || []),
  ];

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      clientId: defaultClientId || "",
      locationId: undefined,
      pteCount: 0,
      otrCount: 0,
      tractorCount: 0,
      preferredWindow: "Any",
      truckSelection: "",
      driverId: undefined,
      notes: "",
    },
  });

  // When the user picks a vehicle that already has an assigned driver,
  // pre-fill the driver dropdown — but the user can still override it.
  const watchedTruck = form.watch("truckSelection");
  const watchedDriver = form.watch("driverId");
  useEffect(() => {
    if (!watchedTruck) return;
    const selected = allTrucks.find(t => t.id === watchedTruck);
    if (selected?.type === 'vehicle' && selected.assignedDriverId && !watchedDriver) {
      form.setValue("driverId", selected.assignedDriverId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedTruck]);

  const onSubmit = async (data: ScheduleFormData) => {
    try {
      // Parse the truck selection to determine if it's a vehicle or hauler
      const selectedTruck = allTrucks.find(t => t.id === data.truckSelection);
      
      if (!selectedTruck) {
        toast({
          title: "Error",
          description: "Selected truck not found. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const isVehicle = selectedTruck.type === 'vehicle';

      // Prefer the explicitly chosen driver from the dropdown.
      // Fall back to the vehicle's assigned driver if nothing was picked.
      let driverId: string | undefined = data.driverId || undefined;
      if (!driverId && isVehicle && selectedTruck.assignedDriverId) {
        driverId = selectedTruck.assignedDriverId;
      }

      await schedulePickup.mutateAsync({
        clientId: data.clientId,
        locationId: data.locationId || undefined,
        pickupDate: format(data.pickupDate, 'yyyy-MM-dd'),
        pteCount: data.pteCount,
        otrCount: data.otrCount,
        tractorCount: data.tractorCount,
        preferredWindow: data.preferredWindow,
        assignmentType: isVehicle ? 'vehicle' : 'hauler',
        vehicleId: isVehicle ? selectedTruck.vehicleId : undefined,
        haulerId: !isVehicle ? selectedTruck.haulerId : undefined,
        driverId: driverId,
        notes: data.notes,
      });
      
      toast({
        title: "Success",
        description: "Pickup scheduled successfully!",
      });
      
      // Get nearby suggestions
      const client = clients?.data.find(c => c.id === data.clientId);
      if (client && user?.currentOrganization?.id) {
        setScheduledClientName(client.company_name);
        try {
          const result = await suggestNearby({
            scheduledClientId: data.clientId,
            organizationId: user.currentOrganization.id
          });
          if (result.suggestions && result.suggestions.length > 0) {
            setSuggestions(result.suggestions);
            setSuggestionsOpen(true);
          }
        } catch (error) {
          console.error('Failed to get suggestions:', error);
        }
      }
      
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Failed to schedule pickup:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule pickup. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    form.setValue("clientId", clientId);
    form.setValue("locationId", undefined); // Will be auto-filled by useEffect
  };

  // Auto-select location if client has locations (first one by default)
  useEffect(() => {
    if (locations && locations.length > 0 && selectedClientId) {
      form.setValue("locationId", locations[0].id);
    }
  }, [locations, selectedClientId, form]);


  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Pickup</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            aria-expanded={clientComboOpen}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? clients?.data.find((client) => client.id === field.value)?.company_name
                              : "Search and select client..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                       <PopoverContent className="w-full p-0 z-50 bg-popover" align="start">
                         <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Search clients..." 
                            value={clientSearch}
                            onValueChange={setClientSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No client found.</CommandEmpty>
                            <CommandGroup>
                              {clients?.data.map((client) => (
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
                                      field.value === client.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{client.company_name}</span>
                                    {client.contact_name && (
                                      <span className="text-sm text-muted-foreground">
                                        Contact: {client.contact_name}
                                      </span>
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

               <FormField
                 control={form.control}
                 name="locationId"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Service Address</FormLabel>
                     {selectedClientId && clients?.data && (
                       <div className="mb-2 p-3 bg-muted rounded-md">
                         <div className="text-sm font-medium">Client Address:</div>
                         <div className="text-sm text-muted-foreground">
                           {(() => {
                             const client = clients.data.find(c => c.id === selectedClientId);
                             if (!client) return "No address found";
                             
                             const address = client.physical_address || client.mailing_address;
                             const city = client.physical_city || client.city;
                             const state = client.physical_state || client.state;
                             const zip = client.physical_zip || client.zip;
                             
                             if (!address) return "No address on file";
                             return `${address}, ${city}, ${state} ${zip}`;
                           })()}
                         </div>
                         {locations && locations.length > 0 && (
                           <div className="text-xs text-muted-foreground mt-1">
                             Or select a different location below
                           </div>
                         )}
                       </div>
                     )}
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value ?? undefined}
                        disabled={!selectedClientId || !locations || locations.length === 0}
                      >
                       <FormControl>
                         <SelectTrigger>
                           <SelectValue placeholder={
                             !selectedClientId 
                               ? "Select a client first" 
                               : !locations || locations.length === 0
                                 ? "Using client address above"
                                 : "Or select alternate location"
                           } />
                         </SelectTrigger>
                       </FormControl>
                       <SelectContent className="z-50 bg-popover">
                          {locations && locations.length > 0 ? (
                            locations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                <div>
                                  <div className="font-medium">{location.address || location.name}</div>
                                  {location.address && location.name && (
                                    <div className="text-sm text-muted-foreground">{location.name}</div>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-sm text-muted-foreground">
                              No alternate locations. Using client address.
                            </div>
                          )}
                       </SelectContent>
                     </Select>
                     <FormMessage />
                   </FormItem>
                )}
              />
            </div>

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
                        <SelectValue placeholder="Select a truck or hauler">
                          {field.value && (() => {
                            const selected = allTrucks.find(t => t.id === field.value);
                            return selected ? (
                              <div className="flex items-center gap-2 truncate">
                                {selected.type === 'vehicle' ? (
                                  <Truck className="h-4 w-4 text-primary flex-shrink-0" />
                                ) : (
                                  <Building className="h-4 w-4 text-secondary flex-shrink-0" />
                                )}
                                <span className="truncate">{selected.name}</span>
                              </div>
                            ) : null;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="z-50 bg-popover max-h-[300px]">
                      {allTrucks.map((truck) => (
                        <SelectItem key={truck.id} value={truck.id} textValue={truck.name} className="cursor-pointer">
                          <div className="flex items-start gap-2 w-full max-w-[280px]">
                            <div className="flex-shrink-0 mt-0.5">
                              {truck.type === 'vehicle' ? (
                                <Truck className="h-4 w-4 text-primary" />
                              ) : (
                                <Building className="h-4 w-4 text-secondary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{truck.name}</div>
                              {truck.details && (
                                <div className="text-sm text-muted-foreground truncate">
                                  {truck.details}
                                </div>
                              )}
                              {truck.driverInfo && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <User className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{truck.driverInfo}</span>
                                </div>
                              )}
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

            {/* Driver Selection — independent of vehicle assignment */}
            <FormField
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver (Optional)</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                    value={field.value ?? "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a driver" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="z-50 bg-popover">
                      <SelectItem value="__none__">
                        <span className="text-muted-foreground">No driver assigned</span>
                      </SelectItem>
                      {drivers?.map((driver) => {
                        const name = [driver.first_name, driver.last_name].filter(Boolean).join(" ").trim() || driver.email;
                        return (
                          <SelectItem key={driver.id} value={driver.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{name}</div>
                                <div className="text-xs text-muted-foreground">{driver.email}</div>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    <FormLabel>Preferred Time Window</FormLabel>
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="pteCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PTE Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
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
                    <FormLabel>OTR Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
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
                    <FormLabel>Tractor Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special instructions or notes for this pickup"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={schedulePickup.isPending}>
                {schedulePickup.isPending ? "Scheduling..." : "Schedule Pickup"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
      </Dialog>

      <NearbyClientSuggestions
        open={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
        suggestions={suggestions}
        scheduledClientName={scheduledClientName}
      />
    </>
  );
}