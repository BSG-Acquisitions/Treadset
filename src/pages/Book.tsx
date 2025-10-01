import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin, Phone, Mail, Building } from "lucide-react";


const publicBookingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  pteCount: z.number().int().min(0, "PTE count must be 0 or greater"),
  otrCount: z.number().int().min(0, "OTR count must be 0 or greater"),
  tractorCount: z.number().int().min(0, "Tractor count must be 0 or greater"),
  preferredDate: z.string().min(1, "Preferred date is required"),
  preferredWindow: z.enum(["AM", "PM", "Any"]),
  notes: z.string().optional(),
});

type PublicBookingData = z.infer<typeof publicBookingSchema>;

export default function Book() {
  useEffect(() => {
    document.title = "Schedule Pickup – TreadSet";
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<PublicBookingData>({
    resolver: zodResolver(publicBookingSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      pteCount: 0,
      otrCount: 0,
      tractorCount: 0,
      preferredDate: "",
      preferredWindow: "Any",
      notes: "",
    },
  });

  const handleSubmit = async (data: PublicBookingData) => {
    try {
      setIsSubmitting(true);
      
      // Calculate minimum total count
      const totalCount = data.pteCount + data.otrCount + data.tractorCount;
      if (totalCount === 0) {
        toast({
          title: "Error",
          description: "Please specify at least one tire to pick up",
          variant: "destructive"
        });
        return;
      }

      const { data: result, error } = await supabase.functions.invoke('public-booking', {
        body: data
      });

      if (error) {
        throw error;
      }

      if (result.success) {
        // Navigate to confirmation page with data
        const confirmationParams = new URLSearchParams({
          data: encodeURIComponent(JSON.stringify(result))
        });
        navigate(`/booking-confirmation?${confirmationParams.toString()}`);
      } else {
        throw new Error(result.error || 'Booking failed');
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast({
        title: "Booking Error",
        description: error.message || "Failed to schedule pickup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      
      
      <main>
        <header className="container py-12 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Schedule a Tire Pickup</h1>
          <p className="text-lg text-muted-foreground">
            Get your tires collected with our optimized route planning
          </p>
        </header>
        
        <div className="container pb-12">
          <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Pickup Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Contact Details
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="ABC Trucking Co." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Location Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Pickup Location
                    </h3>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address *</FormLabel>
                          <FormControl>
                            <PlacesAutocomplete
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Enter pickup address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Pickup Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Tire Details</h3>
                    
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
                            <FormLabel>OTR Count</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
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
                            <FormLabel>Tractor Count</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
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
                  </div>

                  {/* Schedule Preferences */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Schedule Preferences</h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="preferredDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred Date *</FormLabel>
                            <FormControl>
                               <Input 
                                type="date" 
                                {...field} 
                                min={(() => {
                                  const today = new Date();
                                  const year = today.getFullYear();
                                  const month = String(today.getMonth() + 1).padStart(2, '0');
                                  const day = String(today.getDate()).padStart(2, '0');
                                  return `${year}-${month}-${day}`;
                                })()} 
                              />
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
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any special instructions or access notes..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? "Scheduling Pickup..." : "Schedule Pickup"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          </div>
        </div>
      </main>
    </div>
  );
}