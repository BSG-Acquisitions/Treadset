import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarDays, Phone, Mail, MapPin, Truck, Clock, Building2, CheckCircle2, Info, Star, AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { BrandHeader } from "@/components/BrandHeader";
import { format, addDays, getDay } from "date-fns";

const MIN_TIRE_THRESHOLD = 50; // Minimum 50 PTE required

// Common email domain typos to detect
const COMMON_EMAIL_TYPOS = [
  '@yaho.com', '@yahooo.com', '@yhaoo.com',
  '@gmial.com', '@gmal.com', '@gamil.com', '@gmaill.com', '@gmali.com',
  '@hotmal.com', '@hotmial.com', '@hotamil.com',
  '@outloo.com', '@outlok.com',
  '@aol.co', '@aoI.com',
];

// Generic company names to reject
const GENERIC_COMPANY_NAMES = [
  'company', 'my company', 'business', 'my business', 'test', 'testing',
  'n/a', 'na', 'none', 'abc', 'xxx', 'asdf', 'sample', 'example',
];

// Full schema for new visitors - all contact fields required with enhanced validation
const newVisitorSchema = z.object({
  name: z.string()
    .min(2, "Name is required")
    .refine(val => val.trim().split(/\s+/).length >= 2, {
      message: "Please enter your full name (first and last)"
    }),
  email: z.string()
    .email("Please enter a valid email address")
    .refine(val => !COMMON_EMAIL_TYPOS.some(typo => val.toLowerCase().includes(typo)), {
      message: "Check your email - common typo detected (e.g., @gmail.com, @yahoo.com)"
    }),
  phone: z.string()
    .min(10, "Phone number is required")
    .regex(/^[\d\s\-\(\)\.+]+$/, "Please enter a valid phone number")
    .refine(val => val.replace(/\D/g, '').length >= 10, {
      message: "Phone number must have at least 10 digits"
    }),
  company: z.string()
    .min(2, "Company name is required")
    .refine(val => !GENERIC_COMPANY_NAMES.includes(val.toLowerCase().trim()), {
      message: "Please enter your actual company/business name"
    }),
  address: z.string()
    .min(5, "Address is required")
    .refine(val => /\b\d{5}(-\d{4})?\b/.test(val), {
      message: "Please enter a complete address including ZIP code"
    }),
  passengerOffRim: z.number().min(0, "Count must be 0 or greater"),
  passengerOnRim: z.number().min(0, "Count must be 0 or greater"),
  semiCount: z.number().min(0, "Count must be 0 or greater"),
  oversizedCount: z.number().min(0, "Count must be 0 or greater"),
  preferredDate: z.string().min(1, "Please select a preferred date"),
  preferredWindow: z.enum(['AM', 'PM', 'Any']),
  notes: z.string().optional(),
});

// Relaxed schema for returning clients - only tire info and date required
const returningClientSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  passengerOffRim: z.number().min(0, "Count must be 0 or greater"),
  passengerOnRim: z.number().min(0, "Count must be 0 or greater"),
  semiCount: z.number().min(0, "Count must be 0 or greater"),
  oversizedCount: z.number().min(0, "Count must be 0 or greater"),
  preferredDate: z.string().min(1, "Please select a preferred date"),
  preferredWindow: z.enum(['AM', 'PM', 'Any']),
  notes: z.string().optional(),
});

type PublicBookingData = z.infer<typeof newVisitorSchema>;

interface ServiceZone {
  id: string;
  zone_name: string;
  primary_service_days: string[];
  zip_codes: string[];
}

interface SuggestedDate {
  date: string;
  dayName: string;
  isRecommended: boolean;
}

interface ClientData {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  isReturningClient?: boolean;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAME_TO_NUMBER: Record<string, number> = {
  'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
  'thursday': 4, 'friday': 5, 'saturday': 6
};

export default function PublicBook() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchedZone, setMatchedZone] = useState<ServiceZone | null>(null);
  const [suggestedDates, setSuggestedDates] = useState<SuggestedDate[]>([]);
  const [estimatedPteValue, setEstimatedPteValue] = useState(0);
  const [isHighValue, setIsHighValue] = useState(false);
  const [isBelowMinimum, setIsBelowMinimum] = useState(true);
  const [isLoadingClient, setIsLoadingClient] = useState(false);
  const [returningClientName, setReturningClientName] = useState<string | null>(null);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Use conditional schema based on whether this is a returning client
  const form = useForm<PublicBookingData>({
    resolver: zodResolver(returningClientName ? returningClientSchema : newVisitorSchema),
    mode: "onBlur", // Validate on blur for immediate feedback
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      passengerOffRim: 0,
      passengerOnRim: 0,
      semiCount: 0,
      oversizedCount: 0,
      preferredDate: "",
      preferredWindow: "Any",
      notes: "",
    },
  });

  const passengerOffRim = form.watch("passengerOffRim");
  const passengerOnRim = form.watch("passengerOnRim");
  const semiCount = form.watch("semiCount");
  const oversizedCount = form.watch("oversizedCount");
  const address = form.watch("address");

  // Check for client pre-fill from URL parameter (from outreach emails or portal invites)
  useEffect(() => {
    const clientId = searchParams.get('client');
    const inviteId = searchParams.get('invite'); // From portal invite email tracking
    
    if (!clientId && !inviteId) return;

    const loadClientData = async () => {
      setIsLoadingClient(true);
      try {
        const { data, error } = await supabase.functions.invoke('public-booking', {
          body: { 
            action: 'check-client', 
            clientId, 
            inviteId,
            fromEmail: true 
          }
        });

        if (error || !data?.success || !data?.client) {
          console.log('Client not found or error:', error);
          return;
        }

        const client = data.client as ClientData;
        setReturningClientName(client.company || client.name);
        setClientData(client);
        
        // Pre-fill form with client data
        if (client.name) form.setValue('name', client.name);
        if (client.company) form.setValue('company', client.company);
        if (client.email) form.setValue('email', client.email);
        if (client.phone) form.setValue('phone', client.phone);
        if (client.address) form.setValue('address', client.address);

        toast({
          title: "Welcome back!",
          description: `We've pre-filled your information. Just add your tire counts and pick a date.`,
        });
      } catch (err) {
        console.error('Error loading client data:', err);
      } finally {
        setIsLoadingClient(false);
      }
    };

    loadClientData();
  }, [searchParams, form, toast]);

  // Calculate estimated PTE value when tire counts change
  useEffect(() => {
    // PTE conversion: Passenger = 1:1, Semi = 5:1, Oversized (OTR/Tractor) = 15:1
    const totalPte = 
      (passengerOffRim || 0) + 
      (passengerOnRim || 0) + 
      (semiCount || 0) * 5 + 
      (oversizedCount || 0) * 15;
    const totalTires = (passengerOffRim || 0) + (passengerOnRim || 0) + (semiCount || 0) + (oversizedCount || 0);
    setEstimatedPteValue(totalPte);
    setIsHighValue(totalPte >= 200);
    setIsBelowMinimum(totalPte < MIN_TIRE_THRESHOLD);
  }, [passengerOffRim, passengerOnRim, semiCount, oversizedCount]);

  // Extract ZIP code and check service zones when address changes
  useEffect(() => {
    const checkServiceZone = async () => {
      if (!address) {
        setMatchedZone(null);
        setSuggestedDates([]);
        return;
      }

      const zipMatch = address.match(/\b\d{5}\b/);
      if (!zipMatch) return;

      const zipCode = zipMatch[0];

      try {
        // Call edge function to get zone info (avoids RLS issues)
        const { data, error } = await supabase.functions.invoke('public-booking', {
          body: {
            action: 'check-zone',
            zipCode,
          }
        });

        // If this fails, fall back to local date generation
        if (error || !data?.zone) {
          setSuggestedDates(generateGenericDates());
          return;
        }

        const zone = data.zone;
        setMatchedZone(zone as ServiceZone);
        
        // Generate suggested dates based on service days
        const serviceDays = (zone.primary_service_days || []).map((d: string) => 
          DAY_NAME_TO_NUMBER[d.toLowerCase()] ?? -1
        ).filter((d: number) => d >= 0);
        
        if (serviceDays.length > 0) {
          const dates = generateSuggestedDates(serviceDays);
          setSuggestedDates(dates);
        } else {
          setSuggestedDates(generateGenericDates());
        }
      } catch (err) {
        console.error('Error checking service zones:', err);
        setSuggestedDates(generateGenericDates());
      }
    };

    // Debounce the zone check
    const timer = setTimeout(checkServiceZone, 500);
    return () => clearTimeout(timer);
  }, [address]);

  const generateSuggestedDates = (serviceDays: number[]): SuggestedDate[] => {
    const dates: SuggestedDate[] = [];
    const today = new Date();
    
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
    
    for (let i = 1; dates.length < 5; i++) {
      const date = addDays(today, i);
      const dayOfWeek = getDay(date);
      
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
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
    // Final validation for minimum tires
    const totalPte = 
      (data.passengerOffRim || 0) + 
      (data.passengerOnRim || 0) + 
      (data.semiCount || 0) * 5 + 
      (data.oversizedCount || 0) * 15;
    
    if (totalPte < MIN_TIRE_THRESHOLD) {
      toast({
        title: "Minimum Not Met",
        description: `A minimum of ${MIN_TIRE_THRESHOLD} tires (PTE equivalent) is required for pickup scheduling. You currently have ${totalPte}.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get clientId and inviteId from URL if returning client
      const clientId = searchParams.get('client');
      const inviteId = searchParams.get('invite');
      
      // For returning clients, use stored clientData as fallback for empty fields
      const submissionData = {
        name: data.name || clientData?.name || '',
        email: data.email || clientData?.email || '',
        phone: data.phone || clientData?.phone || '',
        company: data.company || clientData?.company || '',
        address: data.address || clientData?.address || '',
        // New tire fields
        passengerOffRim: data.passengerOffRim,
        passengerOnRim: data.passengerOnRim,
        semiCount: data.semiCount,
        oversizedCount: data.oversizedCount,
        // Legacy fields for backward compatibility
        pteCount: (data.passengerOffRim || 0) + (data.passengerOnRim || 0),
        otrCount: data.oversizedCount || 0,
        tractorCount: 0, // Deprecated, merged into oversized
        preferredDate: data.preferredDate,
        preferredWindow: data.preferredWindow,
        notes: data.notes,
        source: returningClientName ? 'client_portal' : 'direct',
        clientId: clientId || undefined,
        inviteId: inviteId || undefined,
        fromEmailBooking: !!(clientId || inviteId),
      };

      const { data: result, error } = await supabase.functions.invoke('public-booking', {
        body: submissionData
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
            {returningClientName ? (
              <>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <Link 
                    to="/client-portal" 
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to My Manifests
                  </Link>
                </div>
                <h1 className="text-3xl font-bold mb-2">Welcome Back, {returningClientName}!</h1>
                <p className="text-muted-foreground text-lg">
                  Ready to schedule your next tire pickup? We've pre-filled your details.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold mb-2">Schedule Your Tire Pickup</h1>
                <p className="text-muted-foreground text-lg">
                  Get your used tires collected quickly and responsibly
                </p>
              </>
            )}
          </div>

          {/* Loading state for client data */}
          {isLoadingClient && (
            <div className="text-center py-4 text-muted-foreground">
              Loading your information...
            </div>
          )}

          {/* Minimum Requirement Notice */}
          <Alert className="mb-8 border-amber-500/30 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Minimum {MIN_TIRE_THRESHOLD} tires required</strong> — We require a minimum of {MIN_TIRE_THRESHOLD} PTE 
              (Passenger Tire Equivalents) for scheduled pickups.
            </AlertDescription>
          </Alert>

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
            {/* Contact Information - only show for new visitors */}
            {!returningClientName && (
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
                          placeholder="313-731-0817"
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
            )}

            {/* Pickup Location - only show for new visitors */}
            {!returningClientName && (
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
                          Our trucks are typically in your zone on {(matchedZone.primary_service_days || []).map(d => 
                            d.charAt(0).toUpperCase() + d.slice(1)
                          ).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
              <CardContent className="space-y-6">
                {/* Passenger Tires Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚗</span>
                    <Label className="text-base font-semibold">Passenger Tires</Label>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 pl-7">
                    <div className="space-y-2">
                      <Label htmlFor="passengerOffRim" className="text-sm text-muted-foreground">
                        Off-Rim (tires only, no wheel)
                      </Label>
                      <Input
                        id="passengerOffRim"
                        type="number"
                        min="0"
                        {...form.register("passengerOffRim", { valueAsNumber: true })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passengerOnRim" className="text-sm text-muted-foreground">
                        On-Rim (tire still on wheel)
                      </Label>
                      <Input
                        id="passengerOnRim"
                        type="number"
                        min="0"
                        {...form.register("passengerOnRim", { valueAsNumber: true })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Commercial Tires Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚛</span>
                    <Label className="text-base font-semibold">Commercial Tires</Label>
                  </div>
                  <div className="pl-7">
                    <div className="space-y-2">
                      <Label htmlFor="semiCount" className="text-sm text-muted-foreground">
                        Semi / Truck Tires (18-wheelers, commercial trucks)
                      </Label>
                      <Input
                        id="semiCount"
                        type="number"
                        min="0"
                        {...form.register("semiCount", { valueAsNumber: true })}
                        placeholder="0"
                        className="md:max-w-[50%]"
                      />
                    </div>
                  </div>
                </div>

                {/* Large Equipment Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚜</span>
                    <Label className="text-base font-semibold">Large Equipment Tires</Label>
                  </div>
                  <div className="pl-7">
                    <div className="space-y-2">
                      <Label htmlFor="oversizedCount" className="text-sm text-muted-foreground">
                        OTR / Tractor / Heavy Equipment
                      </Label>
                      <Input
                        id="oversizedCount"
                        type="number"
                        min="0"
                        {...form.register("oversizedCount", { valueAsNumber: true })}
                        placeholder="0"
                        className="md:max-w-[50%]"
                      />
                    </div>
                  </div>
                </div>

                {/* Tire Count Summary */}
                <div className={`p-4 rounded-lg border ${isBelowMinimum ? 'bg-destructive/10 border-destructive/30' : 'bg-green-500/10 border-green-500/30'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Total Tire Count</p>
                      <p className="text-sm text-muted-foreground">
                        {(passengerOffRim || 0) + (passengerOnRim || 0) + (semiCount || 0) + (oversizedCount || 0)} tires
                        {' • '}Estimated PTE: {estimatedPteValue}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Minimum {MIN_TIRE_THRESHOLD} PTE required for pickup
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${isBelowMinimum ? 'text-destructive' : 'text-green-600'}`}>
                        {estimatedPteValue}
                      </p>
                      {isBelowMinimum ? (
                        <p className="text-sm text-destructive">Need {MIN_TIRE_THRESHOLD - estimatedPteValue} more</p>
                      ) : (
                        <p className="text-sm text-green-600">✓ Minimum met</p>
                      )}
                    </div>
                  </div>
                </div>

                {isHighValue && (
                  <p className="text-sm text-amber-600">
                    ⭐ High volume pickups (200+ PTE) receive priority scheduling
                  </p>
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
                          className={sd.isRecommended ? 'border-green-500/50' : ''}
                        >
                          <CalendarDays className="h-3 w-3 mr-1" />
                          {sd.dayName} {format(new Date(sd.date + 'T12:00:00'), 'MMM d')}
                          {sd.isRecommended && <CheckCircle2 className="h-3 w-3 ml-1 text-green-500" />}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

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
                    <Label>Preferred Time Window</Label>
                    <Select
                      value={form.watch("preferredWindow")}
                      onValueChange={(value: 'AM' | 'PM' | 'Any') => form.setValue("preferredWindow", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Morning (8am - 12pm)
                          </div>
                        </SelectItem>
                        <SelectItem value="PM">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Afternoon (12pm - 5pm)
                          </div>
                        </SelectItem>
                        <SelectItem value="Any">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Anytime
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
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  {...form.register("notes")}
                  placeholder="Any special instructions, gate codes, or details about tire location..."
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Submit */}
            <Button 
              type="submit" 
              size="lg" 
              className="w-full"
              disabled={isSubmitting || isBelowMinimum}
            >
              {isSubmitting ? (
                <>Processing...</>
              ) : isBelowMinimum ? (
                <>Minimum {MIN_TIRE_THRESHOLD} PTE Required</>
              ) : (
                <>
                  <CalendarDays className="h-5 w-5 mr-2" />
                  Submit Pickup Request
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center mt-8 text-sm text-muted-foreground">
            <p>Questions? Contact us at <a href="tel:+13137310817" className="text-brand-primary hover:underline">313-731-0817</a></p>
          </div>
        </div>
      </div>
    </main>
  );
}
