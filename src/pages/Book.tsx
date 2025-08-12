import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useClients } from "@/hooks/useClients";
import { useLocations } from "@/hooks/useLocations";
import { useSchedulePickup } from "@/hooks/usePickups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Truck } from "lucide-react";

const schedulePickupSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  locationId: z.string().optional(),
  pickupDate: z.string().min(1, "Pickup date is required"),
  pteCount: z.number().int().min(0, "PTE count must be 0 or greater"),
  otrCount: z.number().int().min(0, "OTR count must be 0 or greater"),
  tractorCount: z.number().int().min(0, "Tractor count must be 0 or greater"),
  preferredWindow: z.enum(["AM", "PM", "Any"]),
  notes: z.string().optional(),
});

type SchedulePickupData = z.infer<typeof schedulePickupSchema>;

export default function Book() {
  useEffect(() => {
    document.title = "Schedule Pickup – BSG";
  }, []);

  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [routeOptions, setRouteOptions] = useState<any[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);

  const { data: clientsData } = useClients({ limit: 100 });
  const { data: locations = [] } = useLocations(selectedClientId);
  const schedulePickup = useSchedulePickup();

  const clients = clientsData?.data || [];

  const form = useForm<SchedulePickupData>({
    resolver: zodResolver(schedulePickupSchema),
    defaultValues: {
      clientId: "",
      locationId: "",
      pickupDate: "",
      pteCount: 0,
      otrCount: 0,
      tractorCount: 0,
      preferredWindow: "Any",
      notes: "",
    },
  });

  const handleSubmit = async (data: SchedulePickupData) => {
    try {
      setIsScheduling(true);
      const result = await schedulePickup.mutateAsync({
        clientId: data.clientId,
        locationId: data.locationId || undefined,
        pickupDate: data.pickupDate,
        pteCount: data.pteCount,
        otrCount: data.otrCount,
        tractorCount: data.tractorCount,
        preferredWindow: data.preferredWindow,
        notes: data.notes,
      });
      
      setRouteOptions(result.options);
      form.reset();
    } catch (error) {
      console.error('Scheduling error:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    form.setValue("clientId", clientId);
    form.setValue("locationId", "");
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="container py-6">
        <h1 className="text-2xl font-semibold text-foreground">Schedule Pickup</h1>
        <p className="text-sm text-muted-foreground">Schedule a tire pickup with route optimization.</p>
      </header>
      
      <div className="container pb-12 grid lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Pickup Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client *</FormLabel>
                      <Select onValueChange={handleClientChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.company_name}
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
                  name="pickupDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} min={new Date().toISOString().split('T')[0]} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          <SelectItem value="Any">Any Time</SelectItem>
                          <SelectItem value="AM">Morning (AM)</SelectItem>
                          <SelectItem value="PM">Afternoon (PM)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isScheduling} className="w-full">
                  {isScheduling ? "Scheduling..." : "Schedule Pickup"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {routeOptions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Available Slots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routeOptions.map((option, index) => (
                  <div key={`${option.vehicleId}-${index}`} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium">{option.vehicleName}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {new Date(option.eta).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        {index === 0 ? "Selected" : option.windowLabel}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Remaining capacity: {option.remainingCapacity} PTE</p>
                      <p>Added travel time: {option.addedTravelTimeMinutes} min</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}