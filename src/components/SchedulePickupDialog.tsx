import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSchedulePickup } from "@/hooks/usePickups";
import { useClients } from "@/hooks/useClients";
import { useLocations } from "@/hooks/useLocations";
import { useVehicles } from "@/hooks/useVehicles";
import { useHaulers } from "@/hooks/useHaulers";
import { useEmployees } from "@/hooks/useEmployees";
import { SchedulePickupWithDriverDialog } from "./SchedulePickupWithDriverDialog";
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

const scheduleSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  locationId: z.string().min(1, "Location is required"),
  pickupDate: z.date({
    required_error: "Pickup date is required",
  }),
  pteCount: z.number().min(0).default(0),
  otrCount: z.number().min(0).default(0),
  tractorCount: z.number().min(0).default(0),
  preferredWindow: z.enum(["AM", "PM", "Any"]).default("Any"),
  assignmentType: z.enum(["vehicle", "hauler"]).default("vehicle"),
  vehicleId: z.string().optional(),
  haulerId: z.string().optional(),
  driverId: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.assignmentType === "vehicle") {
    return data.vehicleId && data.vehicleId.length > 0;
  } else if (data.assignmentType === "hauler") {
    return data.haulerId && data.haulerId.length > 0;
  }
  return false;
}, {
  message: "Please select a vehicle or hauler",
  path: ["vehicleId"],
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
  const [clientComboOpen, setClientComboOpen] = useState(false);
  
  const { data: clients } = useClients({ search: clientSearch, limit: 100 });
  const { data: locations } = useLocations(selectedClientId);
  const { data: vehicles } = useVehicles();
  const { data: haulers } = useHaulers();
  const { data: employees } = useEmployees();
  const schedulePickup = useSchedulePickup();

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      clientId: defaultClientId || "",
      locationId: "",
      pteCount: 0,
      otrCount: 0,
      tractorCount: 0,
      preferredWindow: "Any",
      assignmentType: "vehicle",
      vehicleId: "",
      haulerId: "",
      driverId: "",
      notes: "",
    },
  });

  const onSubmit = async (data: ScheduleFormData) => {
    try {
      await schedulePickup.mutateAsync({
        clientId: data.clientId,
        locationId: data.locationId,
        pickupDate: format(data.pickupDate, 'yyyy-MM-dd'),
        pteCount: data.pteCount,
        otrCount: data.otrCount,
        tractorCount: data.tractorCount,
        preferredWindow: data.preferredWindow,
        assignmentType: data.assignmentType,
        vehicleId: data.vehicleId,
        haulerId: data.haulerId,
        driverId: data.driverId,
        notes: data.notes,
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Failed to schedule pickup:', error);
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    form.setValue("clientId", clientId);
    form.setValue("locationId", ""); // Reset location when client changes
  };

  const assignmentType = form.watch("assignmentType");

  return (
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
                              {clients?.data.map((client) => (
                                <CommandItem
                                  key={client.id}
                                  value={client.company_name}
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
                    <FormLabel>Location</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedClientId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations?.map((location) => (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assignmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Type</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      // Reset the opposite field when changing type
                      if (value === "vehicle") {
                        form.setValue("haulerId", "");
                      } else {
                        form.setValue("vehicleId", "");
                      }
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="vehicle">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Internal Vehicle
                          </div>
                        </SelectItem>
                        <SelectItem value="hauler">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            External Hauler
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {assignmentType === "vehicle" ? (
                <FormField
                  control={form.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a vehicle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehicles?.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{vehicle.name}</span>
                                <span className="text-muted-foreground text-sm">
                                  {vehicle.license_plate} • Capacity: {vehicle.capacity} tires
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="haulerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hauler</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a hauler" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {haulers?.map((hauler) => (
                            <SelectItem key={hauler.id} value={hauler.id}>
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{hauler.hauler_name}</span>
                                {(hauler.hauler_mi_reg || hauler.hauler_phone) && (
                                  <span className="text-muted-foreground text-sm">
                                    {hauler.hauler_mi_reg && `Reg: ${hauler.hauler_mi_reg}`}
                                    {hauler.hauler_mi_reg && hauler.hauler_phone && " • "}
                                    {hauler.hauler_phone && `Phone: ${hauler.hauler_phone}`}
                                  </span>
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

              {/* Driver Assignment Field */}
              <FormField
                control={form.control}
                name="driverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Driver (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a driver (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.filter(emp => emp.isActive).map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>
                                {employee.firstName} {employee.lastName}
                                {employee.email && (
                                  <span className="text-muted-foreground ml-1">({employee.email})</span>
                                )}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
  );
}