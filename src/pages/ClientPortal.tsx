import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Calendar, Package, LogOut } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ClientPortal() {
  const { user, signOut } = useAuth();

  // Fetch client info for this user
  const { data: clientInfo, isLoading: clientLoading } = useQuery({
    queryKey: ['client-portal-info', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, contact_name, email, phone')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch manifests for this client
  const { data: manifests, isLoading: manifestsLoading } = useQuery({
    queryKey: ['client-portal-manifests', clientInfo?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manifests')
        .select(`
          id,
          manifest_number,
          status,
          signed_at,
          created_at,
          pdf_path,
          acroform_pdf_path,
          pte_on_rim,
          pte_off_rim,
          otr_count,
          tractor_count,
          total,
          locations:location_id (name, address)
        `)
        .eq('client_id', clientInfo?.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientInfo?.id,
  });

  const handleDownloadManifest = async (pdfPath: string | null, manifestNumber: string) => {
    if (!pdfPath) {
      toast.error('No PDF available for this manifest');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('manifests')
        .createSignedUrl(pdfPath, 3600);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error downloading manifest:', error);
      toast.error('Failed to download manifest');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'AWAITING_RECEIVER_SIGNATURE':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'DRAFT':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!clientInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Client Account Found</CardTitle>
            <CardDescription>
              Your login is not linked to a client account. Please contact BSG Tire Recycling to set up your client portal access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => signOut()} variant="outline" className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{clientInfo.company_name}</h1>
            <p className="text-sm text-muted-foreground">Client Portal</p>
          </div>
          <Button onClick={() => signOut()} variant="ghost" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Welcome, {clientInfo.contact_name || clientInfo.company_name}
            </CardTitle>
            <CardDescription>
              View and download your pickup manifests below. Need to schedule a pickup?{' '}
              <a href="/public-book" className="text-primary hover:underline">
                Request a pickup here
              </a>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Manifests List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Your Manifests
            </CardTitle>
            <CardDescription>
              Download copies of your pickup manifests for your records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {manifestsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : !manifests?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No manifests found yet</p>
                <p className="text-sm mt-2">Your pickup manifests will appear here after service</p>
              </div>
            ) : (
              <div className="space-y-3">
                {manifests.map((manifest) => {
                  const totalPTE = (manifest.pte_on_rim || 0) + (manifest.pte_off_rim || 0) +
                    ((manifest.otr_count || 0) * 15) + ((manifest.tractor_count || 0) * 5);
                  const pdfPath = manifest.acroform_pdf_path || manifest.pdf_path;
                  
                  return (
                    <div
                      key={manifest.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{manifest.manifest_number}</span>
                          <Badge className={getStatusColor(manifest.status)}>
                            {formatStatus(manifest.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(manifest.signed_at || manifest.created_at), 'MMM d, yyyy')}
                          </span>
                          <span>{totalPTE} PTE</span>
                          {manifest.total > 0 && (
                            <span>${manifest.total.toFixed(2)}</span>
                          )}
                        </div>
                        {manifest.locations && (
                          <p className="text-xs text-muted-foreground">
                            {(manifest.locations as any).name || (manifest.locations as any).address}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadManifest(pdfPath, manifest.manifest_number)}
                        disabled={!pdfPath}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>Contact BSG Tire Recycling:</p>
            <p className="mt-2">
              Phone: <a href="tel:+12483338700" className="text-primary hover:underline">(248) 333-8700</a>
            </p>
            <p>
              Email: <a href="mailto:info@bsgtires.com" className="text-primary hover:underline">info@bsgtires.com</a>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
