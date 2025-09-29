import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSchedulePickup } from "@/hooks/usePickups";
import { useClients } from "@/hooks/useClients";
import { useLocations } from "@/hooks/useLocations";
import { useToast } from "@/hooks/use-toast";
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
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const driverPickupSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  location_id: z.string().min(1, "Please select a location"),
  pickup_date: z.date({ required_error: "Please select a pickup date" }),
  preferred_window: z.string().optional(),
  pte_count: z.number().min(0, "PTE count must be 0 or greater").default(0),
  otr_count: z.number().min(0, "OTR count must be 0 or greater").default(0),
  tractor_count: z.number().min(0, "Tractor count must be 0 or greater").default(0),
  notes: z.string().optional(),
});

type DriverPickupFormData = z.infer<typeof driverPickupSchema>;

interface DriverSchedulePickupDialogProps {
  trigger: React.ReactNode;
}

export function DriverSchedulePickupDialog({ trigger }: DriverSchedulePickupDialogProps) {
  const [open, setOpen] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");

  const { toast } = useToast();
  const schedulePickup = useSchedulePickup();
  
  // Fetch clients with search
  const { data: clientsData } = useClients({
    search: clientSearch,
    limit: 50,
  });
  
  // Fetch locations for selected client
  const { data: locationsData } = useLocations(selectedClientId);

  const form = useForm<DriverPickupFormData>({
    resolver: zodResolver(driverPickupSchema),
    defaultValues: {
      client_id: "",
      location_id: "",
      pickup_date: new Date(),
      preferred_window: "",
      pte_count: 0,
      otr_count: 0,
      tractor_count: 0,
      notes: "",
    },
  });

  // Watch client_id to reset location when client changes
  const watchedClientId = form.watch("client_id");
  
  // Reset location when client changes
  if (watchedClientId !== selectedClientId) {
    setSelectedClientId(watchedClientId);
    form.setValue("location_id", "");
  }

  const clients = clientsData?.data || [];
  const locations = locationsData || [];

  const onSubmit = async (data: DriverPickupFormData) => {
    try {
      // Map preferred window to expected enum values
      const mapPreferredWindow = (window: string): 'AM' | 'PM' | 'Any' => {
        if (window.includes('8:00 AM - 12:00 PM')) return 'AM';
        if (window.includes('12:00 PM - 4:00 PM') || window.includes('4:00 PM - 6:00 PM')) return 'PM';
        return 'Any';
      };

      await schedulePickup.mutateAsync({
        clientId: data.client_id,
        locationId: data.location_id,
        pickupDate: format(data.pickup_date, 'yyyy-MM-dd'),
        preferredWindow: data.preferred_window ? mapPreferredWindow(data.preferred_window) : 'Any',
        pteCount: data.pte_count,
        otrCount: data.otr_count,
        tractorCount: data.tractor_count,
        notes: data.notes,
        assignmentType: 'auto', // Let system auto-assign
      });

      toast({
        title: "Pickup Scheduled",
        description: "The pickup has been added to today's schedule and will be automatically assigned.",
      });

      setOpen(false);
      form.reset();
      setSelectedClientId("");
      setClientSearch("");
    } catch (error) {
      console.error('Error scheduling pickup:', error);
      toast({
        title: "Error",
        description: "Failed to schedule pickup. Please try again.",
        variant: "destructive",
      });
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Pickup for Existing Client</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Client Selection */}
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Select Client *</FormLabel>
                  <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {selectedClient ? selectedClient.company_name : "Search and select client..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search clients..."
                          value={clientSearch}
                          onValueChange={setClientSearch}
                        />
                        <CommandList>
                          <CommandEmpty>No clients found.</CommandEmpty>
                          <CommandGroup>
                            {clients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={client.id}
                                onSelect={() => {
                                  field.onChange(client.id);
                                  setClientSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    client.id === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{client.company_name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {client.mailing_address || 'No address on file'}
                                  </div>
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
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            <div>
                              <div className="font-medium">
                                {location.name || 'Primary Location'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {location.address}
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
            )}

            {/* Pickup Date */}
            <FormField
              control={form.control}
              name="pickup_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Pickup Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
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
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preferred Time Window */}
            <FormField
              control={form.control}
              name="preferred_window"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Time Window</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select preferred time (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="8:00 AM - 12:00 PM">Morning (8:00 AM - 12:00 PM)</SelectItem>
                      <SelectItem value="12:00 PM - 4:00 PM">Afternoon (12:00 PM - 4:00 PM)</SelectItem>
                      <SelectItem value="4:00 PM - 6:00 PM">Late Afternoon (4:00 PM - 6:00 PM)</SelectItem>
                      <SelectItem value="Anytime">Anytime</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tire Counts */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="pte_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PTE Tires</FormLabel>
                    <FormControl>
                      <NumericInput
                        min={0}
                        value={field.value}
                        onChange={field.onChange}
                        className="text-center"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="otr_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OTR Tires</FormLabel>
                    <FormControl>
                      <NumericInput
                        min={0}
                        value={field.value}
                        onChange={field.onChange}
                        className="text-center"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tractor_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tractor Tires</FormLabel>
                    <FormControl>
                      <NumericInput
                        min={0}
                        value={field.value}
                        onChange={field.onChange}
                        className="text-center"
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special instructions or notes..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={schedulePickup.isPending}
                className="flex-1"
              >
                {schedulePickup.isPending ? "Scheduling..." : "Schedule Pickup"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}