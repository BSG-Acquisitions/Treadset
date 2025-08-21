import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TopNav } from "@/components/TopNav";
import { ArrowLeft, Save, Building, MapPin, Calendar, Truck, Upload, FileText } from "lucide-react";

const manifestSchema = z.object({
  // Part 1: Scrap Tire Generator Certification
  generator_name: z.string().min(1, "Generator name is required"),
  generator_mailing_address: z.string().min(1, "Mailing address is required"),
  generator_city: z.string().min(1, "City is required"),
  generator_state: z.string().min(1, "State is required"),
  generator_zip: z.string().min(1, "ZIP code is required"),
  generator_physical_address: z.string().min(1, "Physical address is required"),
  generator_physical_city: z.string().min(1, "Physical city is required"),
  generator_physical_state: z.string().min(1, "Physical state is required"),
  generator_physical_zip: z.string().min(1, "Physical ZIP code is required"),
  generator_county: z.string().min(1, "County is required"),
  generator_phone: z.string().min(1, "Phone number is required"),
  consolidated_load: z.boolean().default(false),
  passenger_car_count: z.number().min(0).default(0),
  truck_count: z.number().min(0).default(0),
  oversized_count: z.number().min(0).default(0),
  passenger_tire_equivalents: z.number().min(0).default(0),
  gross_weight: z.number().min(0).optional(),
  tare_weight: z.number().min(0).optional(),
  net_weight: z.number().min(0).optional(),
  volume_weight_processed: z.string().optional(),
  date_processed: z.string().min(1, "Date processed is required"),
  generator_signature_name: z.string().min(1, "Generator signature name is required"),
  generator_signature_date: z.string().min(1, "Generator signature date is required"),
  
  // Part 2: Scrap Tire Hauler Certification
  hauler_reg_number: z.string().min(1, "Hauler registration number is required"),
  hauler_other_id: z.string().optional(),
  hauler_state: z.string().min(1, "Hauler state is required"),
  hauler_name: z.string().min(1, "Hauler name is required"),
  hauler_mailing_address: z.string().min(1, "Hauler mailing address is required"),
  hauler_city: z.string().min(1, "Hauler city is required"),
  hauler_state_address: z.string().min(1, "Hauler state is required"),
  hauler_zip: z.string().min(1, "Hauler ZIP code is required"),
  hauler_phone: z.string().min(1, "Hauler phone is required"),
  hauler_signature_name: z.string().min(1, "Hauler signature name is required"),
  hauler_signature_date: z.string().min(1, "Hauler signature date is required"),
  hauler_gross_weight: z.number().min(0).optional(),
  hauler_tare_weight: z.number().min(0).optional(),
  total_passenger_tire_equivalents: z.number().min(0).default(0),
  
  // Part 3: Receiving Location Certification
  receiving_reg_number: z.string().min(1, "Receiving location registration number is required"),
  receiving_name: z.string().min(1, "Receiving location name is required"),
  receiving_physical_address: z.string().min(1, "Receiving physical address is required"),
  receiving_city: z.string().min(1, "Receiving city is required"),
  receiving_state: z.string().min(1, "Receiving state is required"),
  receiving_zip: z.string().min(1, "Receiving ZIP code is required"),
  receiving_phone: z.string().min(1, "Receiving phone is required"),
  receiving_signature_name: z.string().min(1, "Receiving signature name is required"),
  receiving_signature_date: z.string().min(1, "Receiving signature date is required"),
  facility_type_collection_site: z.boolean().default(false),
  facility_type_end_user: z.boolean().default(false),
  facility_type_exempt_site: z.boolean().default(false),
  facility_type_processor: z.boolean().default(false),
  facility_type_retreader: z.boolean().default(false),
  facility_type_licensed_disposal: z.boolean().default(false),
});

type ManifestFormData = z.infer<typeof manifestSchema>;

interface PickupData {
  id: string;
  pickup_date: string;
  pte_count: number;
  otr_count: number;
  tractor_count: number;
  client_id: string;
  location_id: string;
  clients: {
    company_name: string;
    email: string;
  };
  locations: {
    name: string;
    address: string;
  };
}

export default function DriverManifestCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [pickup, setPickup] = useState<PickupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string>("");

  const pickupId = searchParams.get('pickup');
  const clientId = searchParams.get('client');
  const locationId = searchParams.get('location');

  const form = useForm<ManifestFormData>({
    resolver: zodResolver(manifestSchema),
    defaultValues: {
      // Part 1 defaults
      generator_name: "",
      generator_mailing_address: "",
      generator_city: "",
      generator_state: "MI",
      generator_zip: "",
      generator_physical_address: "",
      generator_physical_city: "",
      generator_physical_state: "MI",
      generator_physical_zip: "",
      generator_county: "",
      generator_phone: "",
      consolidated_load: false,
      passenger_car_count: 0,
      truck_count: 0,
      oversized_count: 0,
      passenger_tire_equivalents: 0,
      gross_weight: 0,
      tare_weight: 0,
      net_weight: 0,
      volume_weight_processed: "",
      date_processed: new Date().toISOString().split('T')[0],
      generator_signature_name: "",
      generator_signature_date: new Date().toISOString().split('T')[0],
      
      // Part 2 defaults
      hauler_reg_number: "",
      hauler_other_id: "",
      hauler_state: "MI",
      hauler_name: "BSG Logistics",
      hauler_mailing_address: "",
      hauler_city: "",
      hauler_state_address: "MI",
      hauler_zip: "",
      hauler_phone: "",
      hauler_signature_name: "",
      hauler_signature_date: new Date().toISOString().split('T')[0],
      hauler_gross_weight: 0,
      hauler_tare_weight: 0,
      total_passenger_tire_equivalents: 0,
      
      // Part 3 defaults
      receiving_reg_number: "",
      receiving_name: "",
      receiving_physical_address: "",
      receiving_city: "",
      receiving_state: "MI",
      receiving_zip: "",
      receiving_phone: "",
      receiving_signature_name: "",
      receiving_signature_date: new Date().toISOString().split('T')[0],
      facility_type_collection_site: false,
      facility_type_end_user: false,
      facility_type_exempt_site: false,
      facility_type_processor: false,
      facility_type_retreader: false,
      facility_type_licensed_disposal: false,
    },
  });

  useEffect(() => {
    if (pickupId) {
      fetchPickupData();
    } else {
      setLoading(false);
    }
  }, [pickupId]);

  const fetchPickupData = async () => {
    try {
      const { data, error } = await supabase
        .from('pickups')
        .select(`
          *,
          clients:client_id(company_name, email),
          locations:location_id(name, address)
        `)
        .eq('id', pickupId)
        .single();

      if (error) throw error;
      
      setPickup(data);
      
      // Pre-fill form with pickup data
      if (data.clients) {
        form.setValue('generator_name', data.clients.company_name);
      }
      
      if (data.locations) {
        form.setValue('generator_physical_address', data.locations.address);
      }
      
      // Calculate total passenger tire equivalents
      const totalPTE = (data.pte_count || 0) + (data.otr_count || 0) + (data.tractor_count || 0);
      form.setValue('passenger_tire_equivalents', totalPTE);
      form.setValue('total_passenger_tire_equivalents', totalPTE);
      
    } catch (error) {
      console.error('Error fetching pickup:', error);
      toast({
        title: "Error",
        description: "Failed to load pickup data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file",
        variant: "destructive"
      });
      return;
    }

    setUploadedFile(file);
    toast({
      title: "File selected",
      description: `${file.name} ready to upload`,
    });
  };

  const onSubmit = async (data: ManifestFormData) => {
    setSaving(true);
    try {
      let pdfPath = "";
      
      // Upload PDF if file is selected
      if (uploadedFile) {
        const fileExt = uploadedFile.name.split('.').pop();
        const fileName = `manifest-${Date.now()}.${fileExt}`;
        const filePath = `${new Date().toISOString().split('T')[0]}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('manifests')
          .upload(filePath, uploadedFile);

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        pdfPath = filePath;
        setUploadedFilePath(filePath);
      }

      // Calculate total tires from the new format
      const totalTires = data.passenger_car_count + data.truck_count + data.oversized_count;
      const estimatedTotal = totalTires * 25; // $25 per tire base price

      // Generate manifest number (in production, use the DB function)
      const manifestNumber = `${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      const manifestData = {
        client_id: pickup?.client_id || clientId,
        location_id: pickup?.location_id || locationId,
        pickup_id: pickupId,
        organization_id: '00000000-0000-0000-0000-000000000000', // TODO: Get from context
        manifest_number: manifestNumber,
        pdf_path: pdfPath,
        
        // Map EGLE form data to our manifest fields
        pte_on_rim: 0,
        pte_off_rim: data.passenger_car_count,
        commercial_22_5_on: 0,
        commercial_22_5_off: data.truck_count,
        commercial_17_5_19_5_on: 0,
        commercial_17_5_19_5_off: 0,
        otr_count: data.oversized_count,
        tractor_count: 0,
        weight_tons: data.gross_weight,
        volume_yards: 0,
        signed_by_name: data.generator_signature_name,
        signed_by_email: "",
        
        // Status and completion
        status: 'COMPLETED',
        signed_at: new Date().toISOString(),
        
        // Totals
        subtotal: estimatedTotal,
        total: estimatedTotal,
        
        // Payment status
        payment_status: 'PENDING',
        payment_method: 'INVOICE',
      };

      const { data: manifest, error } = await supabase
        .from('manifests')
        .insert(manifestData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Manifest Created",
        description: "EGLE-compliant manifest has been created successfully",
      });

      navigate(`/driver/manifest/${manifest.id}`);
      
    } catch (error) {
      console.error('Error creating manifest:', error);
      toast({
        title: "Error",
        description: "Failed to create manifest",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const totalTires = form.watch('passenger_car_count') + 
                   form.watch('truck_count') + 
                   form.watch('oversized_count');

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="container mx-auto p-6">
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="container mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link to="/driver/manifests">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Michigan EGLE Scrap Tire Transportation Record</h1>
            <p className="text-muted-foreground">State-compliant manifest form as required by Michigan Department of Environment</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          
          {/* Pickup Info Sidebar */}
          {pickup && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Pickup Reference
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Client</h4>
                  <p>{pickup.clients?.company_name}</p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </h4>
                  <p className="text-sm">{pickup.locations?.address}</p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date
                  </h4>
                  <p>{new Date(pickup.pickup_date).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Form */}
          <div className="lg:col-span-3">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* PDF Upload First */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Upload State-Compliant Document
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="pdf-upload"
                      />
                      <label
                        htmlFor="pdf-upload"
                        className="flex items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors"
                      >
                        <div className="text-center">
                          {uploadedFile ? (
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-green-600" />
                              <span className="text-sm font-medium">{uploadedFile.name}</span>
                            </div>
                          ) : (
                            <div>
                              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                Click to upload PDF document
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Required Michigan EGLE compliant manifest
                              </p>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  </CardContent>
                </Card>

                {/* Part 1: Scrap Tire Generator Certification */}
                <Card>
                  <CardHeader>
                    <CardTitle>Part 1: Scrap Tire Generator Certification</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="generator_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Generator Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Company/Generator name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="generator_mailing_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mailing Address</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="generator_city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="generator_state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="generator_zip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="generator_county"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>County</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="generator_physical_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Physical Address (Where Tires Were Removed)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="generator_physical_city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Physical City</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="generator_physical_state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Physical State</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="generator_physical_zip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Physical ZIP</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="generator_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number (Including Area Code)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(XXX) XXX-XXXX" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="consolidated_load"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Consolidated Load</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="passenger_car_count"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Passenger Car</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="truck_count"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Truck</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="oversized_count"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Oversized</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="passenger_tire_equivalents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Passenger Tire Equivalents</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="gross_weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gross Weight</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                step="0.1"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tare_weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tare Weight</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                step="0.1"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="net_weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Net Weight</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                step="0.1"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="volume_weight_processed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Volume / Weight of Processed Tires (Cut, Shredded, etc.) to be Transported</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date_processed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Processed</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="generator_signature_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Generator Authorized Signature Print Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="generator_signature_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Part 2: Scrap Tire Hauler Certification */}
                <Card>
                  <CardHeader>
                    <CardTitle>Part 2: Scrap Tire Hauler Certification</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="hauler_reg_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>MI Scrap Tire Hauler Reg. #</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hauler_other_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Other ID #</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hauler_state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Identify State</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="hauler_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hauler Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="hauler_mailing_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hauler Mailing Address</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hauler_city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hauler_state_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="hauler_zip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hauler_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone # (Including Area Code)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="(XXX) XXX-XXXX" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="hauler_gross_weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gross Weight</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                step="0.1"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hauler_tare_weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tare Weight</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                step="0.1"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="total_passenger_tire_equivalents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Passenger Tire Equivalents</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="hauler_signature_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hauler Authorized Signature Print Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hauler_signature_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Part 3: Receiving Location Certification */}
                <Card>
                  <CardHeader>
                    <CardTitle>Part 3: Receiving Location Certification</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="receiving_reg_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>MI Scrap Tire Collection Site Reg. # S-</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="receiving_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Receiving Location Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="receiving_physical_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Physical Address</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="receiving_city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="receiving_state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="receiving_zip"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="receiving_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone # (Including Area Code)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(XXX) XXX-XXXX" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <FormLabel className="text-base font-medium">Facility Type</FormLabel>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <FormField
                          control={form.control}
                          name="facility_type_collection_site"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Collection Site</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="facility_type_processor"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Processor</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="facility_type_end_user"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>End User</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="facility_type_retreader"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Retreader</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="facility_type_exempt_site"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Exempt Site</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="facility_type_licensed_disposal"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Licensed Part 115 Disposal Area</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="receiving_signature_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Scrap Tire End User/Processor/Disposer Authorized Signature Print Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="receiving_signature_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    Total Tires: {totalTires}
                  </Badge>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" asChild>
                      <Link to="/driver/manifests">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={saving || !uploadedFile}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Creating..." : "Create EGLE Manifest"}
                    </Button>
                  </div>
                </div>

              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}