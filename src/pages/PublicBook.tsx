import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Phone, Mail, MapPin, Truck, Clock, Building2 } from "lucide-react";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { BrandHeader } from "@/components/BrandHeader";

const publicBookingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  company: z.string().min(2, "Company name must be at least 2 characters"),
  address: z.string().min(5, "Please enter a complete address"),
  pteCount: z.number().min(0, "Count must be 0 or greater"),
  otrCount: z.number().min(0, "Count must be 0 or greater"),
  tractorCount: z.number().min(0, "Count must be 0 or greater"),
  preferredDate: z.string().min(1, "Please select a preferred date"),
  preferredWindow: z.enum(['AM', 'PM', 'Any']),
  notes: z.string().optional(),
}).refine(
  (data) => data.pteCount > 0 || data.otrCount > 0 || data.tractorCount > 0,
  {
    message: "Please specify at least one tire for pickup",
    path: ["pteCount"],
  }
);

type PublicBookingData = z.infer<typeof publicBookingSchema>;

export default function PublicBook() {
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
    setIsSubmitting(true);

    try {
      // Call the public-booking edge function
      const { data: result, error } = await supabase.functions.invoke('public-booking', {
        body: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          address: data.address,
          pteCount: data.pteCount,
          otrCount: data.otrCount,
          tractorCount: data.tractorCount,
          preferredDate: data.preferredDate,
          preferredWindow: data.preferredWindow,
          notes: data.notes,
        }
      });

      if (error) throw error;

      if (result?.success) {
        // Navigate to confirmation page with booking details
        const confirmationData = encodeURIComponent(JSON.stringify(result));
        navigate(`/public-booking-confirmation?data=${confirmationData}`);
      } else {
        throw new Error(result?.error || 'Booking failed');
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({
        title: "Booking Failed",
        description: error.message || "Unable to schedule pickup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <main className="min-h-screen bg-background">
      <BrandHeader />
      
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Schedule Your Tire Pickup</h1>
            <p className="text-muted-foreground text-lg">
              Get your used tires collected quickly and responsibly
            </p>
          </div>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      {...form.register("name")}
                      placeholder="John Smith"
                    />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name *</Label>
                    <Input
                      id="company"
                      {...form.register("company")}
                      placeholder="ABC Auto Shop"
                    />
                    {form.formState.errors.company && (
                      <p className="text-sm text-destructive">{form.formState.errors.company.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        placeholder="john@company.com"
                        className="pl-10"
                      />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        {...form.register("phone")}
                        placeholder="(555) 123-4567"
                        className="pl-10"
                      />
                    </div>
                    {form.formState.errors.phone && (
                      <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pickup Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Pickup Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="address">Pickup Address *</Label>
                  <PlacesAutocomplete
                    value={form.watch("address")}
                    onChange={(address: string) => form.setValue("address", address)}
                    placeholder="Enter your business address..."
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tire Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Tire Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pteCount">Passenger/Light Truck Tires</Label>
                    <Input
                      id="pteCount"
                      type="number"
                      min="0"
                      {...form.register("pteCount", { valueAsNumber: true })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">Car, SUV, pickup truck tires</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otrCount">OTR (Off-The-Road) Tires</Label>
                    <Input
                      id="otrCount"
                      type="number"
                      min="0"
                      {...form.register("otrCount", { valueAsNumber: true })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">Heavy equipment, mining, farm tires</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tractorCount">Tractor Trailer Tires</Label>
                    <Input
                      id="tractorCount"
                      type="number"
                      min="0"
                      {...form.register("tractorCount", { valueAsNumber: true })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">Semi-truck, commercial tires</p>
                  </div>
                </div>
                {form.formState.errors.pteCount && (
                  <p className="text-sm text-destructive">{form.formState.errors.pteCount.message}</p>
                )}
              </CardContent>
            </Card>

            {/* Scheduling */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Preferred Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preferredDate">Preferred Date *</Label>
                    <Input
                      id="preferredDate"
                      type="date"
                      min={minDate}
                      {...form.register("preferredDate")}
                    />
                    {form.formState.errors.preferredDate && (
                      <p className="text-sm text-destructive">{form.formState.errors.preferredDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredWindow">Preferred Time Window</Label>
                    <Select
                      value={form.watch("preferredWindow")}
                      onValueChange={(value) => form.setValue("preferredWindow", value as "AM" | "PM" | "Any")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select time preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Morning (8 AM - 12 PM)
                          </div>
                        </SelectItem>
                        <SelectItem value="PM">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Afternoon (12 PM - 5 PM)
                          </div>
                        </SelectItem>
                        <SelectItem value="Any">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Anytime (8 AM - 5 PM)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="notes">Special Instructions (Optional)</Label>
                  <Textarea
                    id="notes"
                    {...form.register("notes")}
                    placeholder="Any special instructions for our driver (e.g., gate codes, specific entrance, etc.)"
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="min-w-[200px]"
              >
                {isSubmitting ? "Scheduling..." : "Schedule Pickup"}
              </Button>
            </div>
          </form>

          {/* Footer Info */}
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>Questions? Contact us at <span className="font-medium">support@bsglogistics.com</span> or <span className="font-medium">(555) 123-4567</span></p>
          </div>
        </div>
      </div>
    </main>
  );
}