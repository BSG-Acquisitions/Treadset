import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSendManifestEmail } from "@/hooks/useSendManifestEmail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { 
  ArrowLeft, 
  Mail, 
  Download, 
  CheckCircle, 
  Calendar, 
  MapPin, 
  Building, 
  DollarSign,
  FileText,
  Truck,
  Send
} from "lucide-react";

interface ManifestData {
  id: string;
  manifest_number: string;
  status: string;
  total: number;
  signed_at: string;
  signed_by_name: string;
  signed_by_email: string;
  payment_status: string;
  payment_method: string;
  pdf_path: string;
  pte_on_rim: number;
  pte_off_rim: number;
  commercial_22_5_on: number;
  commercial_22_5_off: number;
  commercial_17_5_19_5_on: number;
  commercial_17_5_19_5_off: number;
  otr_count: number;
  tractor_count: number;
  weight_tons: number;
  volume_yards: number;
  notes: string | null;
  clients: {
    company_name: string;
    email: string;
  };
  locations: {
    name: string;
    address: string;
  };
  pickups: {
    pickup_date: string;
  };
}

export default function DriverManifestView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const sendEmail = useSendManifestEmail();
  
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchManifest();
    }
  }, [id]);

  const fetchManifest = async () => {
    try {
      const { data, error } = await supabase
        .from('manifests')
        .select(`
          *,
          clients:client_id(company_name, email),
          locations:location_id(name, address),
          pickups:pickup_id(pickup_date)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setManifest(data as unknown as ManifestData);
    } catch (error) {
      console.error('Error fetching manifest:', error);
      toast({
        title: "Error",
        description: "Failed to load manifest details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!manifest?.pdf_path) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('manifests')
        .download(manifest.pdf_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manifest-${manifest.manifest_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download PDF",
        variant: "destructive"
      });
    }
  };

  const handleSendManifest = async () => {
    if (!manifest?.clients?.email) {
      toast({
        title: "Email not available",
        description: "No client email address found for this manifest",
        variant: "destructive"
      });
      return;
    }

    try {
      await sendEmail.mutateAsync({
        manifestId: manifest.id,
        to: [manifest.clients.email],
        subject: `Manifest ${manifest.manifest_number} - Tire Collection Complete`,
        messageHtml: `
          <p>Your tire collection service has been completed.</p>
          <p><strong>Manifest Number:</strong> ${manifest.manifest_number}</p>
          <p><strong>Total Amount:</strong> $${Number(manifest.total).toFixed(2)}</p>
          <p>Please find the attached manifest with all signatures and timestamps.</p>
        `
      });
    } catch (error) {
      console.error("Failed to send manifest:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="text-center py-8">Loading manifest...</div>
        </div>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold mb-4">Manifest Not Found</h1>
            <Button asChild>
              <Link to="/driver/manifests">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Manifests
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalTires = 
    manifest.pte_on_rim + 
    manifest.pte_off_rim + 
    manifest.commercial_22_5_on + 
    manifest.commercial_22_5_off +
    manifest.commercial_17_5_19_5_on +
    manifest.commercial_17_5_19_5_off +
    manifest.otr_count + 
    manifest.tractor_count;

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/driver/manifests">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Manifest {manifest.manifest_number}</h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant={manifest.status === 'COMPLETED' ? 'default' : 'secondary'}>
                  {manifest.status}
                </Badge>
                <Badge variant={manifest.payment_status === 'SUCCEEDED' ? 'default' : 'destructive'}>
                  {manifest.payment_status}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            {manifest.pdf_path && (
              <>
                <Button variant="outline" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  onClick={handleSendManifest}
                  disabled={sendEmail.isPending || !manifest.clients?.email}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendEmail.isPending ? 'Sending...' : 'Send to Client'}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          
          {/* Client & Location Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Client & Location Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Client</h4>
                <p>{manifest.clients?.company_name || 'Unknown Client'}</p>
                <p className="text-sm text-muted-foreground">{manifest.clients?.email || '—'}</p>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </h4>
                <p className="font-medium">{manifest.locations?.name || 'No location'}</p>
                <p className="text-sm text-muted-foreground">{manifest.locations?.address || '—'}</p>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Pickup Date
                </h4>
                <p>{manifest.pickups?.pickup_date ? new Date(manifest.pickups.pickup_date).toLocaleDateString() : '—'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Manifest Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Completion Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Signed By</h4>
                <p>{manifest.signed_by_name}</p>
                <p className="text-sm text-muted-foreground">{manifest.signed_by_email}</p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-1">Completed At</h4>
                <p>{manifest.signed_at && new Date(manifest.signed_at).toLocaleString()}</p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-1 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Payment
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">${Number(manifest.total).toFixed(2)}</span>
                  <Badge variant={manifest.payment_status === 'SUCCEEDED' ? 'default' : 'destructive'}>
                    {manifest.payment_status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">via {manifest.payment_method}</p>
              </div>
            </CardContent>
          </Card>

          {/* Tire Counts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Tire Inventory ({totalTires} total)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h5 className="font-medium mb-2">Passenger Tires</h5>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>PTE On Rim:</span>
                      <span>{manifest.pte_on_rim}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PTE Off Rim:</span>
                      <span>{manifest.pte_off_rim}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium mb-2">Commercial Tires</h5>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>22.5 On:</span>
                      <span>{manifest.commercial_22_5_on}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>22.5 Off:</span>
                      <span>{manifest.commercial_22_5_off}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>17.5/19.5 On:</span>
                      <span>{manifest.commercial_17_5_19_5_on}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>17.5/19.5 Off:</span>
                      <span>{manifest.commercial_17_5_19_5_off}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium mb-2">Specialty</h5>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>OTR:</span>
                      <span>{manifest.otr_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tractor:</span>
                      <span>{manifest.tractor_count}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium mb-2">Measurements</h5>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Weight:</span>
                      <span>{manifest.weight_tons} tons</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Volume:</span>
                      <span>{manifest.volume_yards} yd³</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {manifest.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{manifest.notes}</p>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}