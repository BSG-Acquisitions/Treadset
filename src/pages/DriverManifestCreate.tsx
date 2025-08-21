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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TopNav } from "@/components/TopNav";
import { ArrowLeft, Save, Building, MapPin, Calendar, Truck, Upload, FileText } from "lucide-react";

const manifestSchema = z.object({
  // Tire counts
  pte_on_rim: z.number().min(0),
  pte_off_rim: z.number().min(0),
  commercial_22_5_on: z.number().min(0),
  commercial_22_5_off: z.number().min(0),
  commercial_17_5_19_5_on: z.number().min(0),
  commercial_17_5_19_5_off: z.number().min(0),
  otr_count: z.number().min(0),
  tractor_count: z.number().min(0),
  
  // Measurements
  weight_tons: z.number().min(0).optional(),
  volume_yards: z.number().min(0).optional(),
  
  // Customer signature info
  signed_by_name: z.string().min(1, "Customer name is required"),
  signed_by_email: z.string().email("Valid email is required").optional().or(z.literal("")),
  
  // Payment
  payment_method: z.enum(["CARD", "CHECK", "CASH", "INVOICE"]),
  
  // Notes
  notes: z.string().optional(),
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
      pte_on_rim: 0,
      pte_off_rim: 0,
      commercial_22_5_on: 0,
      commercial_22_5_off: 0,
      commercial_17_5_19_5_on: 0,
      commercial_17_5_19_5_off: 0,
      otr_count: 0,
      tractor_count: 0,
      weight_tons: 0,
      volume_yards: 0,
      signed_by_name: "",
      signed_by_email: "",
      payment_method: "CARD",
      notes: "",
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
      form.setValue('otr_count', data.otr_count || 0);
      form.setValue('tractor_count', data.tractor_count || 0);
      
      // Split PTE count between on/off rim (default 50/50)
      const pteCount = data.pte_count || 0;
      form.setValue('pte_on_rim', Math.floor(pteCount / 2));
      form.setValue('pte_off_rim', Math.ceil(pteCount / 2));
      
      // Pre-fill customer email if available
      if (data.clients?.email) {
        form.setValue('signed_by_email', data.clients.email);
      }
      
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

      // Calculate pricing (simplified - in real app, use pricing engine)
      const totalTires = 
        data.pte_on_rim + 
        data.pte_off_rim + 
        data.commercial_22_5_on + 
        data.commercial_22_5_off +
        data.commercial_17_5_19_5_on +
        data.commercial_17_5_19_5_off +
        data.otr_count + 
        data.tractor_count;
      
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
        
        ...data,
        
        // Status and completion
        status: 'COMPLETED',
        signed_at: new Date().toISOString(),
        
        // Totals
        subtotal: estimatedTotal,
        total: estimatedTotal,
        
        // Payment status (would be updated after actual payment processing)
        payment_status: data.payment_method === 'INVOICE' ? 'PENDING' : 'SUCCEEDED',
      };

      const { data: manifest, error } = await supabase
        .from('manifests')
        .insert(manifestData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Manifest Created",
        description: "Manifest has been created successfully",
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

  const totalTires = form.watch('pte_on_rim') + 
                   form.watch('pte_off_rim') + 
                   form.watch('commercial_22_5_on') + 
                   form.watch('commercial_22_5_off') +
                   form.watch('commercial_17_5_19_5_on') +
                   form.watch('commercial_17_5_19_5_off') +
                   form.watch('otr_count') + 
                   form.watch('tractor_count');

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
            <h1 className="text-3xl font-bold">Create New Manifest</h1>
            <p className="text-muted-foreground">Complete tire pickup details and customer signature</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Pickup Info Sidebar */}
          {pickup && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Pickup Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Client</h4>
                  <p>{pickup.clients?.company_name}</p>
                  <p className="text-sm text-muted-foreground">{pickup.clients?.email}</p>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </h4>
                  <p className="font-medium">{pickup.locations?.name}</p>
                  <p className="text-sm text-muted-foreground">{pickup.locations?.address}</p>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date
                  </h4>
                  <p>{new Date(pickup.pickup_date).toLocaleDateString()}</p>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Estimated Counts
                  </h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>PTE:</span>
                      <span>{pickup.pte_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>OTR:</span>
                      <span>{pickup.otr_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tractor:</span>
                      <span>{pickup.tractor_count}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Form */}
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Tire Counts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Tire Inventory</span>
                      <Badge variant="outline">{totalTires} Total Tires</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* Passenger Tires */}
                    <div>
                      <h4 className="font-medium mb-3">Passenger Tire Equipment (PTE)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="pte_on_rim"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PTE On Rim</FormLabel>
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
                          name="pte_off_rim"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PTE Off Rim</FormLabel>
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
                    </div>

                    <Separator />

                    {/* Commercial Tires */}
                    <div>
                      <h4 className="font-medium mb-3">Commercial Tires</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="commercial_22_5_on"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>22.5 On Rim</FormLabel>
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
                          name="commercial_22_5_off"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>22.5 Off Rim</FormLabel>
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
                          name="commercial_17_5_19_5_on"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>17.5/19.5 On Rim</FormLabel>
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
                          name="commercial_17_5_19_5_off"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>17.5/19.5 Off Rim</FormLabel>
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
                    </div>

                    <Separator />

                    {/* Other Tires */}
                    <div>
                      <h4 className="font-medium mb-3">Specialty Tires</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="otr_count"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>OTR (Off-the-Road)</FormLabel>
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
                          name="tractor_count"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tractor Tires</FormLabel>
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
                    </div>

                    <Separator />

                    {/* Measurements */}
                    <div>
                      <h4 className="font-medium mb-3">Measurements (Optional)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="weight_tons"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight (Tons)</FormLabel>
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
                          name="volume_yards"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Volume (Cubic Yards)</FormLabel>
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
                    </div>

                  </CardContent>
                </Card>

                {/* Customer & Payment */}
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Signature & Payment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="signed_by_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Full name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="signed_by_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="email@example.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="payment_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <FormControl>
                            <select 
                              {...field} 
                              className="w-full p-2 border rounded-md"
                            >
                              <option value="CARD">Credit Card</option>
                              <option value="CHECK">Check</option>
                              <option value="CASH">Cash</option>
                              <option value="INVOICE">Invoice Later</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* PDF Upload */}
                    <div>
                      <FormLabel>State-Compliant Manifest Document</FormLabel>
                      <div className="mt-2">
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
                                  Required state-compliant manifest
                                </p>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Any additional notes about this pickup..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" asChild>
                    <Link to="/driver/manifests">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Creating..." : "Create Manifest"}
                  </Button>
                </div>

              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
