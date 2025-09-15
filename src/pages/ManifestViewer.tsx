import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { TopNav } from '@/components/TopNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useManifests } from '@/hooks/useManifests';
import { ManifestPDFControls } from '@/components/ManifestPDFControls';
import { format } from 'date-fns';
import { ArrowLeft, FileText, User, MapPin, Package, Clock, CreditCard, CheckCircle } from 'lucide-react';

export default function ManifestViewer() {
  const { id } = useParams<{ id: string }>();
  const { data: manifests = [], isLoading } = useManifests();
  
  const manifest = manifests.find(m => m.id === id);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT':
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'AWAITING_SIGNATURE':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'AWAITING_PAYMENT':
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'AWAITING_SIGNATURE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'AWAITING_PAYMENT':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="container mx-auto p-6">
          <div className="text-center py-8">Loading manifest...</div>
        </div>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold mb-2">Manifest not found</h2>
              <p className="text-muted-foreground mb-4">
                The manifest you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button asChild variant="outline">
                <Link to="/driver/manifests">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Manifests
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link to="/driver/manifests">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{manifest.manifest_number}</h1>
                <Badge className={getStatusColor(manifest.status)}>
                  {getStatusIcon(manifest.status)}
                  <span className="ml-1">{manifest.status.replace('_', ' ')}</span>
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Created {format(new Date(manifest.created_at), 'PPP p')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Client & Location Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="font-medium">{manifest.client?.company_name}</div>
              </div>
              
              {manifest.location && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Pickup Location</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {manifest.location.name && <div>{manifest.location.name}</div>}
                    {manifest.location.address && <div>{manifest.location.address}</div>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tire Counts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Tire Counts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">PTE Off Rim</div>
                  <div className="text-2xl font-bold text-blue-600">{manifest.pte_off_rim}</div>
                </div>
                <div>
                  <div className="font-medium">PTE On Rim</div>
                  <div className="text-2xl font-bold text-blue-600">{manifest.pte_on_rim}</div>
                </div>
                <div>
                  <div className="font-medium">17.5-19.5 Off</div>
                  <div className="text-2xl font-bold text-green-600">{manifest.commercial_17_5_19_5_off}</div>
                </div>
                <div>
                  <div className="font-medium">17.5-19.5 On</div>
                  <div className="text-2xl font-bold text-green-600">{manifest.commercial_17_5_19_5_on}</div>
                </div>
                <div>
                  <div className="font-medium">22.5 Off</div>
                  <div className="text-2xl font-bold text-purple-600">{manifest.commercial_22_5_off}</div>
                </div>
                <div>
                  <div className="font-medium">22.5 On</div>
                  <div className="text-2xl font-bold text-purple-600">{manifest.commercial_22_5_on}</div>
                </div>
                <div>
                  <div className="font-medium">OTR Count</div>
                  <div className="text-2xl font-bold text-orange-600">{manifest.otr_count}</div>
                </div>
                <div>
                  <div className="font-medium">Tractor Count</div>
                  <div className="text-2xl font-bold text-red-600">{manifest.tractor_count}</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Amount:</span>
                  <span className="text-2xl font-bold">${manifest.total?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Payment Status:</span>
                  <span className={manifest.payment_status === 'SUCCEEDED' ? 'text-green-600' : ''}>
                    {manifest.payment_status === 'SUCCEEDED' ? 'Paid' : manifest.payment_status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PDF Downloads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Manifest PDFs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ManifestPDFControls
              manifestId={manifest.id}
              pdfPath={manifest.pdf_path}
              acroformPdfPath={manifest.acroform_pdf_path}
              clientEmails={[]}
            />
          </CardContent>
        </Card>

        {/* Signatures */}
        {(manifest.customer_signature_png_path || manifest.driver_signature_png_path) && (
          <Card>
            <CardHeader>
              <CardTitle>Signatures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {manifest.customer_signature_png_path && (
                  <div>
                    <div className="font-medium mb-2">Customer Signature</div>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <img 
                        src={`https://wvjehbozyxhmgdljwsiz.supabase.co/storage/v1/object/public/manifests/${manifest.customer_signature_png_path}`}
                        alt="Customer signature"
                        className="max-w-full h-auto"
                      />
                    </div>
                    {manifest.signed_by_name && (
                      <div className="text-sm text-muted-foreground mt-2">
                        Signed by: {manifest.signed_by_name}
                        {manifest.signed_at && (
                          <span> on {format(new Date(manifest.signed_at), 'PPP p')}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {manifest.driver_signature_png_path && (
                  <div>
                    <div className="font-medium mb-2">Driver Signature</div>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <img 
                        src={`https://wvjehbozyxhmgdljwsiz.supabase.co/storage/v1/object/public/manifests/${manifest.driver_signature_png_path}`}
                        alt="Driver signature"
                        className="max-w-full h-auto"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}