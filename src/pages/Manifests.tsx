import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useManifests } from '@/hooks/useManifests';
import { useClient } from '@/hooks/useClients';
import { format } from 'date-fns';
import { FileText, Clock, CheckCircle, CreditCard, ArrowLeft, MapPin, User, Calendar } from 'lucide-react';
import { ManifestPDFControls } from '@/components/ManifestPDFControls';

export default function Manifests() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('client');
  
  const { data: client } = useClient(clientId || '');
  const { data: manifests = [], isLoading } = useManifests(clientId || undefined);

  useEffect(() => {
    if (client) {
      document.title = `${client.company_name} Manifests – TreadSet`;
    } else {
      document.title = 'All Manifests – TreadSet';
    }
  }, [client]);

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
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
      case 'IN_PROGRESS':
        return 'secondary';
      case 'AWAITING_SIGNATURE':
        return 'default';
      case 'AWAITING_PAYMENT':
        return 'default';
      case 'COMPLETED':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="text-center py-8 text-muted-foreground">Loading manifests...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          {clientId && client && (
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/clients/${clientId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {client.company_name}
              </Link>
            </Button>
          )}
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {client ? `${client.company_name} Manifests` : 'All Manifests'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {manifests.length} {manifests.length === 1 ? 'manifest' : 'manifests'} found
              </p>
            </div>
          </div>
        </div>

        {/* Manifests List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Manifests
            </CardTitle>
            <CardDescription>
              Complete history of all pickup manifests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {manifests.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  No manifests found
                </p>
                <p className="text-sm text-muted-foreground">
                  Manifests will appear here once created
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {manifests.map((manifest) => (
                  <div
                    key={manifest.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                  >
                    {/* Left side - Manifest info */}
                    <div className="flex items-start gap-4 flex-1">
                      {getStatusIcon(manifest.status)}
                      <div className="flex flex-col space-y-2 flex-1">
                        {/* Manifest number and status */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">
                            {manifest.manifest_number}
                          </span>
                          <Badge variant={getStatusColor(manifest.status)}>
                            {manifest.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        
                        {/* Client and Location info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {!clientId && manifest.client && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-3.5 w-3.5" />
                              <span>{manifest.client.company_name}</span>
                            </div>
                          )}
                          
                          {manifest.location && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="truncate">{manifest.location.address}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {format(new Date(manifest.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                        </div>

                        {/* Tire counts */}
                        <div className="flex gap-2 flex-wrap">
                          {(manifest.pte_off_rim + manifest.pte_on_rim) > 0 && (
                            <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 px-2 py-0.5 rounded text-xs font-medium">
                              {manifest.pte_off_rim + manifest.pte_on_rim} PTE
                            </span>
                          )}
                          {manifest.otr_count > 0 && (
                            <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 px-2 py-0.5 rounded text-xs font-medium">
                              {manifest.otr_count} OTR
                            </span>
                          )}
                          {(manifest.commercial_17_5_19_5_off + manifest.commercial_17_5_19_5_on + manifest.commercial_22_5_off + manifest.commercial_22_5_on + manifest.tractor_count) > 0 && (
                            <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 px-2 py-0.5 rounded text-xs font-medium">
                              {manifest.commercial_17_5_19_5_off + manifest.commercial_17_5_19_5_on + manifest.commercial_22_5_off + manifest.commercial_22_5_on + manifest.tractor_count} COM
                            </span>
                          )}
                        </div>

                        {/* PDF Controls for completed manifests */}
                        {manifest.status === 'COMPLETED' && (manifest.pdf_path || manifest.acroform_pdf_path) && (
                          <div className="mt-2">
                            <ManifestPDFControls
                              manifestId={manifest.id}
                              acroformPdfPath={manifest.acroform_pdf_path}
                              clientEmails={manifest.client?.email ? [manifest.client.email] : []}
                              className="text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Right side - Payment and action */}
                    <div className="flex items-center gap-4 md:flex-col md:items-end">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-foreground">
                          ${manifest.total.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {manifest.payment_status === 'SUCCEEDED' ? 'Paid' : 
                           manifest.payment_status === 'PENDING' ? 'Pending' :
                           manifest.payment_method}
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        asChild
                      >
                        <Link to={`/driver/manifest/${manifest.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
