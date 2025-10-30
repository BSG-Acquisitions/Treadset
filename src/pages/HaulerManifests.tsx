import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Loader2 } from "lucide-react";
import { useHaulerProfile } from "@/hooks/useIndependentHaulers";
import { useHaulerManifests } from "@/hooks/useHaulerManifests";
import { ManifestPDFControls } from "@/components/ManifestPDFControls";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function HaulerManifests() {
  const navigate = useNavigate();
  const { data: haulerProfile, isLoading: profileLoading } = useHaulerProfile();
  const { manifests, isLoading: manifestsLoading } = useHaulerManifests(haulerProfile?.id);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", label: string }> = {
      'AWAITING_RECEIVER_SIGNATURE': { variant: 'secondary', label: 'Awaiting Facility' },
      'COMPLETED': { variant: 'default', label: 'Completed' },
      'DRAFT': { variant: 'outline', label: 'Draft' }
    };
    const config = statusConfig[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (profileLoading || manifestsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!haulerProfile) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-destructive">Access Denied</h2>
            <p className="text-muted-foreground mt-2">
              You need to be registered as a hauler to access this page.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Manifests</h1>
            <p className="text-muted-foreground">Track your tire delivery manifests</p>
          </div>
          <Button onClick={() => navigate('/hauler-manifest-create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Manifest
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Manifest History</CardTitle>
          </CardHeader>
          <CardContent>
            {!manifests?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No manifests yet</p>
                <p className="text-sm mt-1">Create your first manifest to get started</p>
                <Button 
                  className="mt-4"
                  onClick={() => navigate('/hauler-manifest-create')}
                >
                  Create Manifest
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manifest #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Tires</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manifests.map((manifest) => {
                    const totalTires = (manifest.pte_off_rim || 0) + 
                                     (manifest.pte_on_rim || 0) + 
                                     (manifest.otr_count || 0) + 
                                     (manifest.tractor_count || 0);
                    
                    // Use client name from the manifest
                    const customerName = manifest.clients?.company_name || 'Unknown Customer';

                    return (
                      <TableRow key={manifest.id}>
                        <TableCell>
                          <Badge variant="outline">{manifest.manifest_number}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{customerName}</TableCell>
                        <TableCell>
                          {manifest.created_at ? format(new Date(manifest.created_at), 'MMM d, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>{totalTires}</TableCell>
                        <TableCell className="font-medium">
                          ${manifest.paid_amount?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell>{getStatusBadge(manifest.status)}</TableCell>
                        <TableCell className="text-right">
                          {manifest.acroform_pdf_path && (
                            <ManifestPDFControls
                              manifestId={manifest.id}
                              acroformPdfPath={manifest.acroform_pdf_path}
                              clientEmails={[]}
                              className="inline-flex"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
