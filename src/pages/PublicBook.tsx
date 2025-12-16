import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Phone, Mail, MapPin, Truck, Clock, Building2, CheckCircle2, Info, Star } from "lucide-react";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { BrandHeader } from "@/components/BrandHeader";
import { format, addDays, getDay } from "date-fns";

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

interface ServiceZone {
  id: string;
  zone_name: string;
  primary_service_days: string[] | number[];
  zip_codes: string[];
}

interface SuggestedDate {
  date: string;
  dayName: string;
  isRecommended: boolean;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function PublicBook() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchedZone, setMatchedZone] = useState<ServiceZone | null>(null);
  const [suggestedDates, setSuggestedDates] = useState<SuggestedDate[]>([]);
  const [estimatedPteValue, setEstimatedPteValue] = useState(0);
  const [isHighValue, setIsHighValue] = useState(false);
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

  const pteCount = form.watch("pteCount");
  const otrCount = form.watch("otrCount");
  const tractorCount = form.watch("tractorCount");
  const address = form.watch("address");

  // Calculate estimated PTE value when tire counts change
  useEffect(() => {
    const totalPte = (pteCount || 0) + (otrCount || 0) * 15 + (tractorCount || 0) * 5;
    setEstimatedPteValue(totalPte);
    setIsHighValue(totalPte >= 200);
  }, [pteCount, otrCount, tractorCount]);

  // Extract ZIP code and check service zones when address changes
  useEffect(() => {
    const checkServiceZone = async () => {
      if (!address) {
        setMatchedZone(null);
        setSuggestedDates([]);
        return;
      }

      // Extract ZIP code from address
      const zipMatch = address.match(/\b\d{5}\b/);
      if (!zipMatch) return;

      const zipCode = zipMatch[0];

      try {
        // Query service zones that contain this ZIP code
        const { data: zones, error } = await supabase
          .from('service_zones')
          .select('id, zone_name, primary_service_days, zip_codes')
          .eq('is_active', true)
          .contains('zip_codes', [zipCode]);

        if (error) {
          console.error('Error checking service zones:', error);
          return;
        }

        if (zones && zones.length > 0) {
          const zone = zones[0];
          setMatchedZone(zone as ServiceZone);
          
          // Generate suggested dates based on service days (convert strings to numbers if needed)
          const serviceDays = (zone.primary_service_days || []).map((d: string | number) => 
            typeof d === 'string' ? parseInt(d, 10) : d
          );
          const dates = generateSuggestedDates(serviceDays);
          setSuggestedDates(dates);
        } else {
          setMatchedZone(null);
          // Generate generic dates for the next 2 weeks
          setSuggestedDates(generateGenericDates());
        }
      } catch (err) {
        console.error('Error checking service zones:', err);
      }
    };

    checkServiceZone();
  }, [address]);

  const generateSuggestedDates = (serviceDays: number[]): SuggestedDate[] => {
    const dates: SuggestedDate[] = [];
    const today = new Date();
    
    // Look at next 21 days for service day matches
    for (let i = 1; i <= 21 && dates.length < 6; i++) {
      const date = addDays(today, i);
      const dayOfWeek = getDay(date);
      
      if (serviceDays.includes(dayOfWeek)) {
        dates.push({
          date: format(date, 'yyyy-MM-dd'),
          dayName: DAYS_OF_WEEK[dayOfWeek],
          isRecommended: true,
        });
      }
    }

    return dates;
  };

  const generateGenericDates = (): SuggestedDate[] => {
    const dates: SuggestedDate[] = [];
    const today = new Date();
    
    // Generate next 5 weekdays
    for (let i = 1; dates.length < 5; i++) {
      const date = addDays(today, i);
      const dayOfWeek = getDay(date);
      
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude weekends
        dates.push({
          date: format(date, 'yyyy-MM-dd'),
          dayName: DAYS_OF_WEEK[dayOfWeek],
          isRecommended: false,
        });
      }
    }

    return dates;
  };

  const handleSubmit = async (data: PublicBookingData) => {
    setIsSubmitting(true);

    try {
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

  const handleSelectSuggestedDate = (date: string) => {
    form.setValue("preferredDate", date);
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

          {/* Approval Process Info */}
          <Card className="mb-8 border-brand-primary/20 bg-brand-primary/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-brand-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">How It Works</p>
                  <p className="text-sm text-muted-foreground">
                    Submit your request and our team will confirm your pickup within 24 hours. 
                    You'll receive an email with your confirmed date and any details.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
              <CardContent className="space-y-4">
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

                {/* Zone Match Indicator */}
                {matchedZone && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-700">We service your area!</p>
                      <p className="text-xs text-muted-foreground">
                        Our trucks are typically in your zone on {(matchedZone.primary_service_days || []).map(d => DAYS_OF_WEEK[typeof d === 'string' ? parseInt(d, 10) : d]).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tire Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Tire Information
                  {isHighValue && (
                    <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-800">
                      <Star className="h-3 w-3 mr-1" />
                      Priority Pickup
                    </Badge>
                  )}
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

                {estimatedPteValue > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Estimated volume: <span className="font-medium">{estimatedPteValue} PTE</span>
                    {isHighValue && (
                      <span className="ml-2 text-amber-600">(Priority scheduling available)</span>
                    )}
                  </div>
                )}

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
                {/* Suggested Dates */}
                {suggestedDates.length > 0 && (
                  <div className="space-y-2">
                    <Label>
                      {matchedZone ? 'Recommended Dates' : 'Available Dates'}
                      {matchedZone && (
                        <span className="text-xs text-muted-foreground ml-2">(Based on your service zone)</span>
                      )}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {suggestedDates.map((sd) => (
                        <Button
                          key={sd.date}
                          type="button"
                          variant={form.watch("preferredDate") === sd.date ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSelectSuggestedDate(sd.date)}
                          className={sd.isRecommended ? "border-green-500/50" : ""}
                        >
                          {sd.dayName} {format(new Date(sd.date + 'T12:00:00'), 'MMM d')}
                          {sd.isRecommended && <CheckCircle2 className="h-3 w-3 ml-1 text-green-600" />}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preferredDate">
                      {suggestedDates.length > 0 ? 'Or Select a Different Date' : 'Preferred Date *'}
                    </Label>
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
            <div className="flex flex-col items-center gap-3">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="min-w-[200px]"
              >
                {isSubmitting ? "Submitting..." : "Request Pickup"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Your request will be reviewed and you'll receive confirmation within 24 hours
              </p>
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
