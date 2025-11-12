import { useEffect, useState } from "react";
import { useManifests } from "@/hooks/useManifests";
import { useSendManifestEmail } from "@/hooks/useSendManifestEmail";
import { useManifestIntegration } from "@/hooks/useManifestIntegration";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReceiverSignatureDialog } from "./ReceiverSignatureDialog";
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Clock, FileText, Signature, Search, Calendar, Filter, ChevronDown, ChevronRight, Mail, Loader2, RefreshCw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ManifestPDFControls } from "@/components/ManifestPDFControls";
import { EmailDeliveryStatus } from "@/components/EmailDeliveryStatus";
import { useToast } from "@/hooks/use-toast";

export const ManifestReceiversView = () => {
  const { data: manifests, isLoading } = useManifests();
  const [selectedManifest, setSelectedManifest] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [manifestClientNames, setManifestClientNames] = useState<Record<string, string>>({});
  const { mutate: sendEmail } = useSendManifestEmail();
  const manifestIntegration = useManifestIntegration();
  const { toast } = useToast();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Removed automatic status sync - status should only be updated when receiver signature is added
  // This prevents marking manifests as COMPLETED without proper receiver signature workflow

  // Apply filters and search
  const getFilteredManifests = (manifestList: any[], isPending: boolean) => {
    if (!manifestList) return [];
    
    let filtered = manifestList.filter(manifest => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const displayName = (manifestClientNames[manifest.id] || clientNames[manifest.client_id] || '').toLowerCase();
        const manifestNumber = (manifest.manifest_number || '').toLowerCase();
        if (!displayName.includes(search) && !manifestNumber.includes(search)) {
          return false;
        }
      }
      
      // Date filter
      if (dateFilter !== "all") {
        const manifestDate = new Date(manifest.updated_at || manifest.created_at || manifest.signed_at);
        const now = new Date();
        
        switch (dateFilter) {
          case "today":
            return manifestDate >= startOfDay(now) && manifestDate <= endOfDay(now);
          case "week":
            return manifestDate >= subDays(now, 7);
          case "month":
            return manifestDate >= subDays(now, 30);
        }
      }
      
      return true;
    });
    
    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || a.signed_at);
      const dateB = new Date(b.updated_at || b.created_at || b.signed_at);
      
      switch (sortBy) {
        case "newest":
          return dateB.getTime() - dateA.getTime();
        case "oldest":
          return dateA.getTime() - dateB.getTime();
        case "client": {
          const nameA = (manifestClientNames[a.id] || clientNames[a.client_id] || '').toString();
          const nameB = (manifestClientNames[b.id] || clientNames[b.client_id] || '').toString();
          return nameA.localeCompare(nameB);
        }
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  // Filter manifests that need receiver signature 
  // Check for ANY signature field (old signed_at or new generator_signed_at/hauler_signed_at)
  // Treat records marked COMPLETED without receiver signature as pending (legacy bug)
  const pendingReceiverSignature = manifests?.filter(m => 
    (m.receiver_signed_at == null) &&
    (m.signed_at || m.generator_signed_at || m.hauler_signed_at)
  ) || [];
  
  // Filter manifests that have all signatures (check both old and new signature fields)
  const completedManifests = manifests?.filter(m => 
    m.status === 'COMPLETED' && 
    (m.signed_at || m.generator_signed_at || m.hauler_signed_at) && 
    m.receiver_signed_at
  ) || [];

  // Fallback: fetch pending directly if query returns none (e.g., relation join issues)
  const [fallbackPending, setFallbackPending] = useState<any[]>([]);
  useEffect(() => {
    const fetchFallback = async () => {
      try {
        const { data, error } = await supabase
          .from('manifests')
.select(`
            id, 
            manifest_number, 
            status, 
            signed_at,
            generator_signed_at,
            hauler_signed_at,
            receiver_signed_at,
            client_id,
            email_status,
            email_sent_at,
            email_sent_to,
            email_error
          `)
          .is('receiver_signed_at', null)
          .order('created_at', { ascending: false });
        if (error) throw error;
        
        // Filter to only include manifests that have at least one initial signature
        const filtered = (data || []).filter(m => 
          m.signed_at || m.generator_signed_at || m.hauler_signed_at
        );
        
        setFallbackPending(filtered);
        console.log('ReceiverSignatures fallback count:', filtered.length);
      } catch (e) {
        console.error('Fallback fetch failed:', e);
      }
    };

    if ((pendingReceiverSignature?.length || 0) === 0) {
      fetchFallback();
    } else {
      setFallbackPending([]);
    }
   }, [pendingReceiverSignature?.length]);

  // Build a map of client_id -> company_name for display without DB joins
  // Also fetch dropoff customer names for dropoff manifests
  useEffect(() => {
    const fetchClientNames = async () => {
      try {
        const clientIds = new Set<string>();
        const manifestIds = new Set<string>();
        
        (manifests || []).forEach((m: any) => {
          if (m.client_id) clientIds.add(m.client_id);
          manifestIds.add(m.id);
        });
        (fallbackPending || []).forEach((m: any) => {
          if (m.client_id) clientIds.add(m.client_id);
          manifestIds.add(m.id);
        });
        
        if (clientIds.size === 0) return;
        
        // Fetch client names
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id, company_name')
          .in('id', Array.from(clientIds));
        if (clientError) throw clientError;
        
        const map: Record<string, string> = {};
        (clientData || []).forEach((c: any) => { map[c.id] = c.company_name; });
        
        // Build per-manifest display names for dropoff manifests
        const dropoffManifests = (manifests || []).concat(fallbackPending || [])
          .filter((m: any) => map[m.client_id] === 'Dropoff Customers');
        
        const manifestNameMap: Record<string, string> = {};
        
        if (dropoffManifests.length > 0) {
          const { data: dropoffData, error: dropoffError } = await supabase
            .from('dropoffs')
            .select(`
              manifest_id,
              client_id,
              clients (
                company_name,
                contact_name
              )
            `)
            .in('manifest_id', dropoffManifests.map(m => m.id))
            .not('manifest_id', 'is', null);
          
          if (!dropoffError && dropoffData) {
            dropoffData.forEach((d: any) => {
              if (d.manifest_id && d.clients) {
                const name = d.clients.company_name || d.clients.contact_name || 'Unknown Customer';
                manifestNameMap[d.manifest_id] = name;
              }
            });
          }
        }
        
        setClientNames(map);
        setManifestClientNames(manifestNameMap);
      } catch (e) {
        console.error('Failed fetching client names', e);
      }
    };
    fetchClientNames();
  }, [manifests, fallbackPending]);

  const handleAddReceiverSignature = (manifestId: string) => {
    setSelectedManifest(manifestId);
    setDialogOpen(true);
  };

  const handleResendEmail = async (manifestId: string, manifestNumber: string) => {
    try {
      setSendingId(manifestId);

      // Find the manifest locally first (from either list)
      const all = (manifests || []).concat(fallbackPending || []);
      const manifest: any = all.find((m: any) => m.id === manifestId);

      // Determine recipient email in a robust way
      let to: string | undefined = undefined;

      // 1) Prefer last known recipients on the manifest record
      if (Array.isArray(manifest?.email_sent_to) && manifest.email_sent_to.length > 0) {
        to = manifest.email_sent_to[0];
      }

      // 2) Fallback to client email via a quick lookup
      if (!to && manifest?.client_id) {
        const { data: client, error: clientErr } = await supabase
          .from('clients')
          .select('email, company_name')
          .eq('id', manifest.client_id)
          .maybeSingle();
        
        if (!clientErr && client) {
          // If this is a dropoff manifest, fetch dropoff customer email
        if (!clientErr && client?.email) {
          to = client.email;
        }
        }
      }

      if (!to) {
        toast({
          title: 'Missing recipient',
          description: 'No email on file for this customer. Please add an email and try again.',
          variant: 'destructive',
        });
        return;
      }

      // Send a single email for this manifest only
      sendEmail(
        { manifestId, to },
        {
          onSuccess: () => {
            toast({
              title: 'Email sent',
              description: `Manifest ${manifestNumber} has been emailed to ${to}.`,
            });
            queryClient.invalidateQueries({ queryKey: ['manifests'] });
          },
          onError: (error: any) => {
            toast({
              title: 'Email failed',
              description: error?.message || 'Failed to send email. Please try again.',
              variant: 'destructive',
            });
          },
          onSettled: () => {
            setSendingId(null);
          },
        }
      );
    } catch (e: any) {
      setSendingId(null);
      toast({
        title: 'Email failed',
        description: e?.message || 'Unexpected error while preparing email.',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerateManifest = async (manifestId: string, manifestNumber: string) => {
    try {
      setRegeneratingId(manifestId);
      
      toast({
        title: 'Regenerating PDF',
        description: 'Creating new manifest PDF with all signatures...',
      });

      // Regenerate the PDF with all current signature data
      const result = await manifestIntegration.mutateAsync({ 
        manifestId,
        overrides: {} // Use existing data from database
      });

      toast({
        title: 'PDF Regenerated',
        description: 'Manifest PDF has been updated with all signatures.',
      });

      // Get recipient email
      const all = (manifests || []).concat(fallbackPending || []);
      const manifest: any = all.find((m: any) => m.id === manifestId);
      let to: string | undefined = undefined;

      if (Array.isArray(manifest?.email_sent_to) && manifest.email_sent_to.length > 0) {
        to = manifest.email_sent_to[0];
      }

      if (!to && manifest?.client_id) {
        const { data: client, error: clientErr } = await supabase
          .from('clients')
          .select('email')
          .eq('id', manifest.client_id)
          .maybeSingle();
        
        if (!clientErr && client?.email) {
          to = client.email;
        }
      }

      // Automatically resend email with new PDF
      if (to && result.pdfPath) {
        sendEmail(
          { manifestId, to },
          {
            onSuccess: () => {
              toast({
                title: 'Email sent',
                description: `Updated manifest ${manifestNumber} has been emailed to ${to}.`,
              });
              queryClient.invalidateQueries({ queryKey: ['manifests'] });
            },
            onError: (error: any) => {
              toast({
                title: 'Email failed',
                description: error?.message || 'PDF regenerated but email failed. Use Resend Email button.',
                variant: 'destructive',
              });
            },
          }
        );
      } else {
        toast({
          title: 'No email on file',
          description: 'PDF regenerated successfully. Please add customer email and use Resend Email button.',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['manifests'] });
    } catch (e: any) {
      toast({
        title: 'Regeneration failed',
        description: e?.message || 'Failed to regenerate manifest PDF.',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingId(null);
    }
  };
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading manifests...</div>
      </div>
    );
  }

  const pendingList = pendingReceiverSignature.length ? pendingReceiverSignature : fallbackPending;
  const filteredPending = getFilteredManifests(pendingList, true);
  const filteredCompleted = getFilteredManifests(completedManifests, false);

  // Group completed manifests by time period
  const groupCompletedByPeriod = (manifests: any[]) => {
    const now = new Date();
    const groups: Record<string, any[]> = {
      'This Week': [],
      'Last Week': [],
      'This Month': [],
      'Last Month': [],
      'Older': []
    };

    manifests.forEach(manifest => {
      const date = new Date(manifest.receiver_signed_at || manifest.signed_at);
      
      if (isWithinInterval(date, { start: startOfWeek(now), end: endOfWeek(now) })) {
        groups['This Week'].push(manifest);
      } else if (isWithinInterval(date, { start: startOfWeek(subDays(now, 7)), end: endOfWeek(subDays(now, 7)) })) {
        groups['Last Week'].push(manifest);
      } else if (isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) })) {
        groups['This Month'].push(manifest);
      } else if (isWithinInterval(date, { start: startOfMonth(subDays(now, 30)), end: endOfMonth(subDays(now, 30)) })) {
        groups['Last Month'].push(manifest);
      } else {
        groups['Older'].push(manifest);
      }
    });

    // Remove empty groups
    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  };

  const groupedCompleted = groupCompletedByPeriod(filteredCompleted);

  // Table columns for data table view
  const columns = [
    {
      key: "manifest_number",
      title: "Manifest #",
      render: (value: string) => (
        <Badge variant="outline">{value}</Badge>
      ),
    },
    {
      key: "client_id", 
      title: "Client",
      render: (value: string) => clientNames[value] || 'Unknown Client',
    },
    {
      key: "signed_at",
      title: "Initial Signature",
      render: (value: string) => value ? 
        format(new Date(value), 'MMM d, yyyy h:mm a') : 'N/A',
    },
    {
      key: "receiver_signed_at",
      title: "Receiver Signature", 
      render: (value: string) => value ? 
        format(new Date(value), 'MMM d, yyyy h:mm a') : 
        <Badge variant="secondary">Pending</Badge>,
    },
    {
      key: "actions",
      title: "Actions",
      render: (value: any, row: any) => (
        <div className="flex gap-2">
          {!row.receiver_signed_at && (
            <Button 
              size="sm" 
              onClick={() => handleAddReceiverSignature(row.id)}
            >
              <Signature className="h-4 w-4 mr-2" />
              Sign
            </Button>
          )}
          {row.acroform_pdf_path && (
            <ManifestPDFControls
              manifestId={row.id}
              acroformPdfPath={row.acroform_pdf_path}
              clientEmails={[]}
              className="inline-flex"
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Receiver Signatures</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
          >
            Cards
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            Table
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">Past Week</SelectItem>
            <SelectItem value="month">Past Month</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="client">By Client</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Awaiting ({filteredPending.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({filteredCompleted.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {(() => {
            // Group pending manifests by date
            const groupPendingByDate = (manifests: any[]) => {
              const groups: Record<string, any[]> = {};
              
              manifests.forEach(manifest => {
                const date = new Date(manifest.updated_at || manifest.created_at || manifest.signed_at);
                const dateKey = format(date, 'MMMM d, yyyy');
                
                if (!groups[dateKey]) {
                  groups[dateKey] = [];
                }
                groups[dateKey].push(manifest);
              });
              
              // Sort dates descending (newest first)
              return Object.entries(groups).sort((a, b) => {
                return new Date(b[0]).getTime() - new Date(a[0]).getTime();
              });
            };
            
            const groupedPending = groupPendingByDate(filteredPending);
            
            if (filteredPending.length === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  No pending manifests
                </div>
              );
            }
            
            return viewMode === "table" ? (
              <div className="space-y-4">
                {groupedPending.map(([date, manifests]) => (
                  <Collapsible key={date} defaultOpen>
                    <div className="rounded-md border">
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                          <h3 className="font-semibold">{date}</h3>
                          <Badge variant="secondary">{manifests.length}</Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Client</TableHead>
                              <TableHead>Manifest #</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {manifests.map((manifest) => (
                              <TableRow key={manifest.id}>
                                <TableCell>
                                  <div className="font-semibold text-base">
                                    {manifestClientNames[manifest.id] || clientNames[manifest.client_id] || 'Unknown Client'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {manifest.manifest_number}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  { (manifest.updated_at || manifest.signed_at || manifest.created_at) ?
                                    format(new Date(manifest.updated_at || manifest.signed_at || manifest.created_at), 'h:mm a') : 'N/A'
                                  }
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleAddReceiverSignature(manifest.id)}
                                  >
                                    Sign
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {groupedPending.map(([date, manifests]) => (
                  <Collapsible key={date} defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full mb-3 hover:bg-accent p-2 rounded">
                      <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                      <h3 className="font-semibold">{date}</h3>
                      <Badge variant="secondary">{manifests.length}</Badge>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pl-6">
                        {manifests.map((manifest) => (
                          <Card key={manifest.id}>
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div>
                                  <h3 className="font-bold text-lg mb-2">
                                    {manifestClientNames[manifest.id] || clientNames[manifest.client_id] || 'Unknown Client'}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">
                                      {manifest.manifest_number}
                                    </Badge>
                                    {(manifest.updated_at || manifest.signed_at || manifest.created_at) && (
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(manifest.updated_at || manifest.signed_at || manifest.created_at), 'h:mm a')}
                                      </span>
                                    )}
                                    <EmailDeliveryStatus
                                      emailStatus={manifest.email_status}
                                      emailSentAt={manifest.email_sent_at}
                                      emailSentTo={manifest.email_sent_to}
                                      emailError={manifest.email_error}
                                    />
                                  </div>
                                </div>
                                
                                <Button 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => handleAddReceiverSignature(manifest.id)}
                                >
                                  <Signature className="h-4 w-4 mr-2" />
                                  Sign for {manifestClientNames[manifest.id] || clientNames[manifest.client_id] || 'Client'}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="completed">
          {viewMode === "table" ? (
            <div className="space-y-4">
              {groupedCompleted.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No completed manifests
                </div>
              ) : (
                groupedCompleted.map(([period, manifests]) => (
                  <Collapsible key={period} defaultOpen={period === 'This Week' || period === 'This Month'}>
                    <div className="rounded-md border">
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                          <h3 className="font-semibold">{period}</h3>
                          <Badge variant="secondary">{manifests.length}</Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Manifest #</TableHead>
                              <TableHead>Client</TableHead>
                              <TableHead>Completed</TableHead>
                              <TableHead>Email Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {manifests.map((manifest: any) => (
                              <TableRow key={manifest.id}>
                                <TableCell>
                                  <Badge variant="outline">
                                    {manifest.manifest_number}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {manifestClientNames[manifest.id] || clientNames[manifest.client_id] || 'Unknown'}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {manifest.receiver_signed_at ? 
                                    format(new Date(manifest.receiver_signed_at), 'MMM d, h:mm a') : 'N/A'
                                  }
                                </TableCell>
                                 <TableCell>
                                   <EmailDeliveryStatus
                                     emailStatus={manifest.email_status}
                                     emailSentAt={manifest.email_sent_at}
                                     emailSentTo={manifest.email_sent_to}
                                     emailError={manifest.email_error}
                                   />
                                 </TableCell>
                                 <TableCell className="text-right">
                                   <div className="flex items-center justify-end gap-2">
                                     <Button
                                       size="sm"
                                       variant="ghost"
                                       onClick={() => handleRegenerateManifest(manifest.id, manifest.manifest_number)}
                                       disabled={regeneratingId === manifest.id}
                                       title="Regenerate PDF with all signatures"
                                     >
                                       {regeneratingId === manifest.id ? (
                                         <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                       ) : (
                                         <RefreshCw className="h-4 w-4 mr-2" />
                                       )}
                                       Regenerate
                                     </Button>
                                     {(!manifest.email_status || ['not_sent','failed','bounced'].includes(manifest.email_status)) && (
                                       <Button
                                         size="sm"
                                         variant="outline"
                                         onClick={() => handleResendEmail(manifest.id, manifest.manifest_number)}
                                         disabled={sendingId === manifest.id}
                                       >
                                         {sendingId === manifest.id ? (
                                           <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                         ) : (
                                           <Mail className="h-4 w-4 mr-2" />
                                         )}
                                         Resend Email
                                       </Button>
                                     )}
                                     {manifest.acroform_pdf_path && (
                                       <ManifestPDFControls
                                         manifestId={manifest.id}
                                         acroformPdfPath={manifest.acroform_pdf_path}
                                         clientEmails={[]}
                                         className="inline-flex"
                                       />
                                     )}
                                   </div>
                                 </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {groupedCompleted.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No completed manifests
                </div>
              ) : (
                groupedCompleted.map(([period, manifests]) => (
                  <Collapsible key={period} defaultOpen={period === 'This Week' || period === 'This Month'}>
                    <Card>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-90" />
                          <h3 className="font-semibold">{period}</h3>
                          <Badge variant="secondary">{manifests.length}</Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pt-4">
                            {manifests.map((manifest: any) => (
                              <Card key={manifest.id}>
                                <CardContent className="p-4">
                                   <div className="space-y-2">
                                     <div className="flex items-start justify-between">
                                       <div className="space-y-2">
                                         <Badge variant="outline" className="mb-1">
                                           {manifest.manifest_number}
                                         </Badge>
                                         <h3 className="font-medium text-sm">{manifestClientNames[manifest.id] || clientNames[manifest.client_id] || 'Unknown'}</h3>
                                         <div className="flex items-center gap-2">
                                           <EmailDeliveryStatus
                                             emailStatus={manifest.email_status}
                                             emailSentAt={manifest.email_sent_at}
                                             emailSentTo={manifest.email_sent_to}
                                             emailError={manifest.email_error}
                                             className="text-xs"
                                           />
                                           {(!manifest.email_status || ['not_sent','failed','bounced'].includes(manifest.email_status)) && (
                                             <Button
                                               size="sm"
                                               variant="outline"
                                               onClick={() => handleResendEmail(manifest.id, manifest.manifest_number)}
                                               disabled={sendingId === manifest.id}
                                             >
                                               {sendingId === manifest.id ? (
                                                 <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                               ) : (
                                                 <Mail className="h-4 w-4 mr-1" />
                                               )}
                                               Resend
                                             </Button>
                                           )}
                                         </div>
                                       </div>
                                       <Badge variant="secondary" className="text-xs">Complete</Badge>
                                     </div>
                                     
                                     {manifest.receiver_signed_at && (
                                       <p className="text-xs text-muted-foreground">
                                         {format(new Date(manifest.receiver_signed_at), 'MMM d, h:mm a')}
                                       </p>
                                     )}
                                     
                                     <div className="flex items-center gap-2 mt-2">
                                       <Button
                                         size="sm"
                                         variant="ghost"
                                         onClick={() => handleRegenerateManifest(manifest.id, manifest.manifest_number)}
                                         disabled={regeneratingId === manifest.id}
                                         title="Regenerate PDF with all signatures"
                                         className="flex-1"
                                       >
                                         {regeneratingId === manifest.id ? (
                                           <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                         ) : (
                                           <RefreshCw className="h-4 w-4 mr-1" />
                                         )}
                                         Regenerate
                                       </Button>
                                       
                                       {manifest.acroform_pdf_path && (
                                         <ManifestPDFControls
                                           manifestId={manifest.id}
                                           acroformPdfPath={manifest.acroform_pdf_path}
                                           clientEmails={[]}
                                           className="inline-flex"
                                         />
                                       )}
                                     </div>
                                   </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Receiver Signature Dialog */}
      {selectedManifest && (
        <ReceiverSignatureDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          manifestId={selectedManifest}
          manifestNumber={
            manifests?.find(m => m.id === selectedManifest)?.manifest_number || ''
          }
        />
      )}
    </div>
  );
};