import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, Calendar, Package, LogOut, Eye, ArrowLeft, Printer, CalendarPlus, X, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { PdfInlineViewer } from "@/components/PdfInlineViewer";
import { InviteTeamMemberDialog } from "@/components/client-portal/InviteTeamMemberDialog";
import { useClientUserRole, useClientUsers } from "@/hooks/useClientUsers";

export default function ClientPortal() {
  const { user, signOut, hasRole } = useAuth();
  const navigate = useNavigate();
  const isClient = hasRole('client');
  const isAdmin = !isClient && (hasRole('admin') || hasRole('ops_manager'));
  const [previewClientId, setPreviewClientId] = useState<string | null>(null);
  
  // PDF viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPdfPath, setCurrentPdfPath] = useState<string | null>(null);
  const [currentPdfTitle, setCurrentPdfTitle] = useState<string>('');

  // Fetch all clients for admin preview mode
  const { data: allClients } = useQuery({
    queryKey: ['all-clients-for-preview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, contact_name')
        .eq('is_active', true)
        .order('company_name');
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch client info - for regular clients use client_users junction table, for admin preview use selected client
  const { data: clientInfo, isLoading: clientLoading } = useQuery({
    queryKey: ['client-portal-info', isAdmin ? previewClientId : user?.id, isAdmin],
    queryFn: async () => {
      if (isAdmin && previewClientId) {
        // Admin preview mode - fetch selected client
        const { data, error } = await supabase
          .from('clients')
          .select('id, company_name, contact_name, email, phone')
          .eq('id', previewClientId)
          .single();
        
        if (error) throw error;
        return data;
      } else if (!isAdmin && user?.id) {
        // Regular client mode - fetch by client_users junction table
        const { data: clientUser, error: cuError } = await supabase
          .from('client_users')
          .select('client_id, role, clients:client_id(id, company_name, contact_name, email, phone)')
          .eq('user_id', user.id)
          .limit(1)
          .single();
        
        if (cuError) {
          // Fallback to legacy clients.user_id lookup
          const { data, error } = await supabase
            .from('clients')
            .select('id, company_name, contact_name, email, phone')
            .eq('user_id', user.id)
            .single();
          
          if (error) throw error;
          return data;
        }
        
        return clientUser?.clients as any;
      }
      return null;
    },
    enabled: isAdmin ? !!previewClientId : !!user?.id,
  });

  // Get user's role for this client (for showing Invite Team Member button)
  const { data: userRole } = useClientUserRole(clientInfo?.id);
  const isPrimaryContact = userRole === 'primary';
  
  // Get team members for this client
  const { data: teamMembers } = useClientUsers(clientInfo?.id);

  // Fetch manifests for this client
  // ⚠️ SECURITY: Do NOT add any revenue/pricing fields to this query!
  // Fields like 'total', 'computed_revenue', 'final_revenue', 'rate', 
  // 'price_per_unit', etc. must NEVER be exposed to clients.
  // This is a client-facing portal - only show non-financial data.
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
          initial_pdf_path,
          acroform_pdf_path,
          pte_on_rim,
          pte_off_rim,
          otr_count,
          tractor_count,
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

  // Normalize path to ensure it has the correct format for storage
  const normalizePath = (path: string): string => {
    // Remove leading slash if present
    let normalized = path.startsWith('/') ? path.slice(1) : path;
    // Don't double-add manifests/ prefix
    if (!normalized.startsWith('manifests/')) {
      normalized = `manifests/${normalized}`;
    }
    // Remove duplicate manifests/ prefix
    normalized = normalized.replace(/^manifests\/manifests\//, 'manifests/');
    return normalized;
  };

  // Get signed URL for a PDF path
  const getSignedUrl = async (path: string): Promise<string | null> => {
    const normalized = normalizePath(path);
    // Files are stored WITH manifests/ prefix inside the bucket
    
    const { data, error } = await supabase.storage
      .from('manifests')
      .createSignedUrl(normalized, 3600);
    
    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
    return data.signedUrl;
  };

  // View PDF in inline dialog
  const handleView = (pdfPath: string | null, manifestNumber: string, label: string = '') => {
    if (!pdfPath) {
      toast.error('No PDF available for this manifest');
      return;
    }
    setCurrentPdfPath(pdfPath);
    setCurrentPdfTitle(`${manifestNumber}${label ? ` - ${label}` : ''}`);
    setViewerOpen(true);
  };

  // Download PDF as blob
  const handleDownload = async (pdfPath: string | null, manifestNumber: string) => {
    if (!pdfPath) {
      toast.error('No PDF available for this manifest');
      return;
    }

    try {
      const signedUrl = await getSignedUrl(pdfPath);
      if (!signedUrl) {
        toast.error('Failed to access manifest');
        return;
      }

      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${manifestNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading manifest:', error);
      toast.error('Failed to download manifest');
    }
  };

  // Print PDF without opening a new tab (avoids popup blockers)
  const handlePrint = async (pdfPath: string | null) => {
    if (!pdfPath) {
      toast.error('No PDF available for this manifest');
      return;
    }

    try {
      const signedUrl = await getSignedUrl(pdfPath);
      if (!signedUrl) {
        toast.error('Failed to access manifest');
        return;
      }

      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF (HTTP ${response.status})`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;

      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } finally {
            // Cleanup after the print dialog opens
            setTimeout(() => {
              iframe.remove();
              window.URL.revokeObjectURL(url);
            }, 1000);
          }
        }, 250);
      };
    } catch (error) {
      console.error('Error printing manifest:', error);
      toast.error('Failed to print manifest');
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

  // Check if manifest has both initial and final PDFs (different paths)
  const hasBothVersions = (manifest: any) => {
    return manifest.initial_pdf_path && manifest.acroform_pdf_path && 
           manifest.initial_pdf_path !== manifest.acroform_pdf_path;
  };

  // Admin landing - show client selector
  if (isAdmin && !previewClientId) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Client Portal Preview</h1>
              <p className="text-sm text-muted-foreground">Admin Mode - Select a client to preview their portal</p>
            </div>
            <Button onClick={() => navigate('/')} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Select a Client to Preview
              </CardTitle>
              <CardDescription>
                Choose any client to see exactly what their portal experience looks like
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select onValueChange={setPreviewClientId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {allClients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name} {client.contact_name ? `(${client.contact_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <p className="text-sm text-muted-foreground">
                This preview shows exactly what your clients will see when they log into their portal.
                You can verify the layout, download manifests, and ensure the experience is user-friendly.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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
    const isStaff = hasRole('admin') || hasRole('super_admin') || hasRole('ops_manager') || hasRole('dispatcher') || hasRole('sales');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Client Account Found</CardTitle>
            <CardDescription>
              {isStaff
                ? "You're signed in as staff. This portal is for client accounts only."
                : "Your login is not linked to a client account. Please contact BSG Tire Recycling to set up your client portal access."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isStaff ? (
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            ) : (
              <Button onClick={() => signOut()} variant="outline" className="w-full">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            )}
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
            <p className="text-sm text-muted-foreground">
              {isAdmin ? 'Admin Preview Mode' : 'Client Portal'}
            </p>
          </div>
          {isAdmin ? (
            <Button onClick={() => setPreviewClientId(null)} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Change Client
            </Button>
          ) : (
            <Button onClick={() => signOut()} variant="ghost" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          )}
        </div>
      </header>

      {/* Admin Preview Banner */}
      {isAdmin && (
        <div className="bg-primary/10 border-b border-primary/20 px-6 py-2">
          <div className="max-w-4xl mx-auto flex items-center gap-2 text-sm text-primary">
            <Eye className="w-4 h-4" />
            <span>You are viewing this portal as <strong>{clientInfo.company_name}</strong> would see it</span>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Welcome, {clientInfo.contact_name || clientInfo.company_name}
            </CardTitle>
            <CardDescription>
              View and download your pickup manifests below.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to={`/public-book?client=${clientInfo.id}`}>
                <CalendarPlus className="w-4 h-4 mr-2" />
                Schedule a Pickup
              </Link>
            </Button>
            
            {/* Invite Team Member - only show for primary contacts */}
            {(isPrimaryContact || isAdmin) && (
              <InviteTeamMemberDialog 
                clientId={clientInfo.id} 
                companyName={clientInfo.company_name} 
              />
            )}
          </CardContent>
        </Card>

        {/* Team Members Card - only show for primary contacts */}
        {(isPrimaryContact || isAdmin) && teamMembers && teamMembers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                People with access to this portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-card/50">
                    <div>
                      <span className="font-medium">
                        {member.user?.first_name} {member.user?.last_name}
                      </span>
                      <span className="text-muted-foreground ml-2 text-sm">
                        ({member.user?.email})
                      </span>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manifests List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Your Manifests
            </CardTitle>
            <CardDescription>
              Download or print copies of your pickup manifests for your records
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
              <div className="space-y-4">
                {manifests.map((manifest) => {
                  const totalPTE = (manifest.pte_on_rim || 0) + (manifest.pte_off_rim || 0) +
                    ((manifest.otr_count || 0) * 15) + ((manifest.tractor_count || 0) * 5);
                  const hasMultiplePDFs = hasBothVersions(manifest);
                  const isCompleted = manifest.status === 'COMPLETED';
                  
                  return (
                    <div
                      key={manifest.id}
                      className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-medium text-lg">{manifest.manifest_number}</span>
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
                          </div>
                          {manifest.locations && (
                            <p className="text-sm text-muted-foreground">
                              {(manifest.locations as any).name || (manifest.locations as any).address}
                            </p>
                          )}
                        </div>
                        
                        {/* PDF Actions */}
                        <div className="flex flex-col gap-2">
                          {/* Show both PDFs if available and different */}
                          {hasMultiplePDFs ? (
                            <>
                              <div className="text-xs text-muted-foreground mb-1">Initial (2-signature):</div>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleView(manifest.initial_pdf_path, manifest.manifest_number, 'Initial')}
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownload(manifest.initial_pdf_path, `${manifest.manifest_number}-initial`)}
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePrint(manifest.initial_pdf_path)}
                                  title="Print"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground mt-2 mb-1">Final (3-signature):</div>
                              <div className="flex gap-1">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleView(manifest.acroform_pdf_path, manifest.manifest_number, 'Final')}
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleDownload(manifest.acroform_pdf_path, `${manifest.manifest_number}-final`)}
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handlePrint(manifest.acroform_pdf_path)}
                                  title="Print"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-xs text-muted-foreground mb-1">
                                {isCompleted ? 'Final Manifest:' : 'Manifest:'}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleView(
                                    manifest.acroform_pdf_path || manifest.initial_pdf_path || manifest.pdf_path, 
                                    manifest.manifest_number
                                  )}
                                  disabled={!manifest.acroform_pdf_path && !manifest.initial_pdf_path && !manifest.pdf_path}
                                  title="View"
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownload(
                                    manifest.acroform_pdf_path || manifest.initial_pdf_path || manifest.pdf_path, 
                                    manifest.manifest_number
                                  )}
                                  disabled={!manifest.acroform_pdf_path && !manifest.initial_pdf_path && !manifest.pdf_path}
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePrint(
                                    manifest.acroform_pdf_path || manifest.initial_pdf_path || manifest.pdf_path
                                  )}
                                  disabled={!manifest.acroform_pdf_path && !manifest.initial_pdf_path && !manifest.pdf_path}
                                  title="Print"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
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
              Phone: <a href="tel:+13137310817" className="text-primary hover:underline">313-731-0817</a>
            </p>
            <p>
              Email: <a href="mailto:bsgtires@gmail.com" className="text-primary hover:underline">bsgtires@gmail.com</a>
            </p>
          </CardContent>
        </Card>
      </main>

      {/* PDF Inline Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{currentPdfTitle}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => currentPdfPath && handleDownload(currentPdfPath, currentPdfTitle.replace(' - ', '-'))}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => currentPdfPath && handlePrint(currentPdfPath)}
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {currentPdfPath && (
            <PdfInlineViewer filePath={currentPdfPath} className="min-h-[60vh]" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
