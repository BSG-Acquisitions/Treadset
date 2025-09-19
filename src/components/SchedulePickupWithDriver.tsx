import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useClients } from "@/hooks/useClients";
import { useVehicles } from "@/hooks/useVehicles";
import { useEmployees } from "@/hooks/useEmployees";
import { useSchedulePickupWithDriver } from "@/hooks/useSchedulePickupWithDriver";
import { Calendar, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLocalDateString } from "@/lib/formatters";

const scheduleSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  locationId: z.string().optional(),
  vehicleId: z.string().min(1, "Vehicle is required"),
  driverId: z.string().min(1, "Driver is required"),
  pickupDate: z.string().min(1, "Date is required"),
  pteCount: z.number().min(0, "Must be 0 or greater"),
  otrCount: z.number().min(0, "Must be 0 or greater"),
  tractorCount: z.number().min(0, "Must be 0 or greater"),
  preferredWindow: z.enum(["AM", "PM", "Any"]),
  notes: z.string().optional(),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface SchedulePickupWithDriverProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

export function SchedulePickupWithDriver({ children, onSuccess }: SchedulePickupWithDriverProps) {
  const [open, setOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const { data: clientsData = { data: [], count: 0, totalPages: 0 } } = useClients({ search: clientSearch, limit: 100 });
  const { data: vehicles = [] } = useVehicles();
  const { data: employees = [] } = useEmployees();

  const clients = Array.isArray(clientsData) ? clientsData : clientsData.data;

  // Filter drivers from employees  
  const drivers = employees.filter(emp => emp.roles?.includes('driver'));

  const schedulePickup = useSchedulePickupWithDriver();

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      pteCount: 0,
      otrCount: 0, 
      tractorCount: 0,
      preferredWindow: "Any",
      pickupDate: formatLocalDateString(new Date()), // Today's date
    },
  });

  const selectedClient = form.watch("clientId");
  const clientLocations = clients.find(c => c.id === selectedClient)?.locations || [];

  const onSubmit = (data: ScheduleFormData) => {
    schedulePickup.mutate({
      clientId: data.clientId,
      locationId: data.locationId,
      vehicleId: data.vehicleId,
      driverId: data.driverId,
      pickupDate: data.pickupDate,
      pteCount: data.pteCount,
      otrCount: data.otrCount,
      tractorCount: data.tractorCount,
      preferredWindow: data.preferredWindow,
      notes: data.notes,
    }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        onSuccess?.();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Pickup with Driver Assignment
          </DialogTitle>
          <DialogDescription>
            Create a new pickup and assign it directly to a driver and vehicle.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Client *</FormLabel>
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
                              ? clients.find((client) => client.id === field.value)?.company_name
                              : "Search and select client..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search clients..." 
                            value={clientSearch}
                            onValueChange={setClientSearch}
                          />
                          <CommandList>
                            <CommandEmpty>No client found.</CommandEmpty>
                            <CommandGroup>
                              {clients.map((client) => (
                                <CommandItem
                                  key={client.id}
                                  value={client.company_name}
                                  onSelect={() => {
                                    field.onChange(client.id);
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
                    <FormLabel>Location</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedClient || clientLocations.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientLocations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name || location.address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.name} (Capacity: {vehicle.capacity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.firstName} {driver.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pickupDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} min={formatLocalDateString(new Date())} />
                    </FormControl>
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
                      <SelectContent>
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Special instructions or notes..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end">
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
  );
}