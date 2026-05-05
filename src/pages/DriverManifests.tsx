import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useManifests } from '@/hooks/useManifests';
import { useAssignments } from '@/hooks/usePickups';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Plus, FileText, Clock, CheckCircle, CreditCard, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ManifestPDFControls } from '@/components/ManifestPDFControls';

export default function DriverManifests() {
  const [selectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { user } = useAuth();
  
  const { data: manifests = [], isLoading: manifestsLoading, error: manifestsError } = useManifests(undefined, user?.id);
  const { data: assignments = [], isLoading: assignmentsLoading, error: assignmentsError } = useAssignments(selectedDate);
  const queryError = manifestsError || assignmentsError;

  const todaysManifests = manifests.filter(manifest => 
    format(new Date(manifest.created_at), 'yyyy-MM-dd') === selectedDate
  );

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

  if (queryError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Failed to load manifests</CardTitle>
              <CardDescription>{(queryError as Error).message || 'Unknown error'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.reload()} variant="outline">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (manifestsLoading || assignmentsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Driver Manifests</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage digital manifests for today's routes
            </p>
          </div>
          <Button asChild className="bg-brand-primary hover:bg-brand-primary/90">
            <Link to="/driver/manifest/new">
              <Plus className="h-4 w-4 mr-2" />
              New Manifest
            </Link>
          </Button>
        </div>

        {/* Today's Routes - Available for Manifest Creation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-primary" />
              Today's Routes ({format(new Date(), 'MMM d, yyyy')})
            </CardTitle>
            <CardDescription>
              Assigned stops ready for manifest creation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No routes assigned for today</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {assignments.map((assignment) => {
                  const hasManifest = todaysManifests.some(m => m.pickup_id === assignment.pickup?.id);
                  
                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {assignment.pickup?.client?.company_name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {assignment.pickup?.location?.address}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Est. Arrival: {assignment.estimated_arrival ? 
                              format(new Date(assignment.estimated_arrival), 'h:mm a') : 
                              'TBD'
                            }
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {hasManifest ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Manifest Created
                          </Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            asChild
                            className="bg-brand-primary hover:bg-brand-primary/90"
                          >
                            <Link to={`/driver/manifest/new?pickup=${assignment.pickup?.id}&client=${assignment.pickup?.client_id}&location=${assignment.pickup?.location_id}`}>
                              <Plus className="h-4 w-4 mr-1" />
                              Create Manifest
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Manifests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-primary" />
              Today's Manifests
            </CardTitle>
            <CardDescription>
              Digital manifests created today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaysManifests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No manifests created today</p>
                <p className="text-sm mt-1">Create manifests from your assigned pickups</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {todaysManifests.map((manifest) => (
                  <div
                    key={manifest.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(manifest.status)}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {manifest.manifest_number}
                          </span>
                          <Badge className={getStatusColor(manifest.status)}>
                            {manifest.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {manifest.client?.company_name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {manifest.location?.address}
                        </span>
                        
                        {/* Show PDF controls when manifest is completed */}
                        {manifest.status === 'COMPLETED' && (manifest.pdf_path || manifest.acroform_pdf_path) && (
                          <div className="mt-2 max-w-md">
                            <ManifestPDFControls
                              manifestId={manifest.id}
                              acroformPdfPath={manifest.acroform_pdf_path}
                              clientEmails={[]}
                              className="text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <div className="font-medium text-foreground">
                          ${manifest.total.toFixed(2)}
                        </div>
                        <div className="text-muted-foreground">
                          {manifest.payment_status === 'SUCCEEDED' ? 'Paid' : 
                           manifest.payment_method === 'CARD' ? 'Card' : 
                           manifest.payment_method}
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        asChild
                      >
                        <Link to={`/driver/manifest/${manifest.id}`}>
                          View
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