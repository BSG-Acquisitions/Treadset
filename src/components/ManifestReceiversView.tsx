import { useEffect, useState } from "react";
import { useManifests } from "@/hooks/useManifests";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReceiverSignatureDialog } from "./ReceiverSignatureDialog";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Clock, FileText, Signature, Search, Calendar, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ManifestPDFControls } from "@/components/ManifestPDFControls";

export const ManifestReceiversView = () => {
  const { data: manifests, isLoading } = useManifests();
  const [selectedManifest, setSelectedManifest] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // One-time sync: move manifests without receiver signature into AWAITING_RECEIVER_SIGNATURE
  useEffect(() => {
    const syncStatuses = async () => {
      try {
        await supabase
          .from('manifests')
          .update({ status: 'AWAITING_RECEIVER_SIGNATURE', updated_at: new Date().toISOString() })
          .in('status', ['DRAFT', 'COMPLETED', 'AWAITING_SIGNATURE', 'IN_PROGRESS'])
          .is('receiver_signed_at', null)
          .not('signed_at', 'is', null);
        queryClient.invalidateQueries({ queryKey: ['manifests'] });
      } catch (e) {
        console.error('Sync statuses failed', e);
      }
    };
    syncStatuses();
  }, [queryClient]);

  // Apply filters and search
  const getFilteredManifests = (manifestList: any[], isPending: boolean) => {
    if (!manifestList) return [];
    
    let filtered = manifestList.filter(manifest => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const clientName = clientNames[manifest.client_id]?.toLowerCase() || '';
        const manifestNumber = manifest.manifest_number?.toLowerCase() || '';
        if (!clientName.includes(search) && !manifestNumber.includes(search)) {
          return false;
        }
      }
      
      // Date filter
      if (dateFilter !== "all") {
        const manifestDate = new Date(manifest.created_at || manifest.signed_at);
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
      const dateA = new Date(a.created_at || a.signed_at);
      const dateB = new Date(b.created_at || b.signed_at);
      
      switch (sortBy) {
        case "newest":
          return dateB.getTime() - dateA.getTime();
        case "oldest":
          return dateA.getTime() - dateB.getTime();
        case "client":
          const clientA = clientNames[a.client_id] || '';
          const clientB = clientNames[b.client_id] || '';
          return clientA.localeCompare(clientB);
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  // Filter manifests that need receiver signature 
  const pendingReceiverSignature = manifests?.filter(m => 
    (m.receiver_signed_at == null) && m.status !== 'COMPLETED'
  ) || [];
  
  // Filter manifests that have all signatures
  const completedManifests = manifests?.filter(m => 
    m.status === 'COMPLETED' && 
    m.signed_at && 
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
            receiver_signed_at,
            client_id
          `)
          .is('receiver_signed_at', null)
          .not('signed_at', 'is', null)
          .neq('status', 'COMPLETED')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setFallbackPending(data || []);
        console.log('ReceiverSignatures fallback count:', (data || []).length);
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
  useEffect(() => {
    const fetchClientNames = async () => {
      try {
        const ids = new Set<string>();
        (manifests || []).forEach((m: any) => m.client_id && ids.add(m.client_id));
        (fallbackPending || []).forEach((m: any) => m.client_id && ids.add(m.client_id));
        if (ids.size === 0) return;
        const { data, error } = await supabase
          .from('clients')
          .select('id, company_name')
          .in('id', Array.from(ids));
        if (error) throw error;
        const map: Record<string, string> = {};
        (data || []).forEach((c: any) => { map[c.id] = c.company_name; });
        setClientNames(map);
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Signature className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Receiver Signatures</h1>
        </div>
        
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
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by manifest # or client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
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
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="client">By Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Awaiting Signature ({filteredPending.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Completed ({filteredCompleted.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {viewMode === "table" ? (
            <Card>
              <CardContent className="p-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Manifest #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Initial Signature</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPending.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <p className="text-muted-foreground">No manifests found matching your criteria</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPending.map((manifest) => (
                          <TableRow key={manifest.id}>
                            <TableCell>
                              <Badge variant="outline" className="text-orange-600">
                                {manifest.manifest_number}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {clientNames[manifest.client_id] || 'Unknown Client'}
                            </TableCell>
                            <TableCell>
                              {manifest.signed_at ? 
                                format(new Date(manifest.signed_at), 'MMM d, yyyy h:mm a') : 'N/A'
                              }
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">Awaiting Receiver</Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="sm" 
                                onClick={() => handleAddReceiverSignature(manifest.id)}
                              >
                                <Signature className="h-4 w-4 mr-2" />
                                Sign
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPending.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">No manifests found matching your criteria</p>
                </div>
              ) : (
                filteredPending.map((manifest) => (
                  <Card key={manifest.id} className="border-orange-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-orange-600">
                            {manifest.manifest_number}
                          </Badge>
                          <Badge variant="secondary">Awaiting Receiver</Badge>
                        </div>
                        
                        <h3 className="font-medium">{clientNames[manifest.client_id] || 'Unknown Client'}</h3>
                        
                        {manifest.signed_at && (
                          <p className="text-sm text-muted-foreground">
                            Signed: {format(new Date(manifest.signed_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                        
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleAddReceiverSignature(manifest.id)}
                        >
                          <Signature className="h-4 w-4 mr-2" />
                          Add Receiver Signature
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {viewMode === "table" ? (
            <Card>
              <CardContent className="p-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Manifest #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Initial Signature</TableHead>
                        <TableHead>Receiver Signature</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompleted.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <p className="text-muted-foreground">No completed manifests found matching your criteria</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCompleted.map((manifest) => (
                          <TableRow key={manifest.id}>
                            <TableCell>
                              <Badge variant="outline" className="text-green-600">
                                {manifest.manifest_number}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {clientNames[manifest.client_id] || 'Unknown Client'}
                            </TableCell>
                            <TableCell>
                              {manifest.signed_at ? 
                                format(new Date(manifest.signed_at), 'MMM d, yyyy h:mm a') : 'N/A'
                              }
                            </TableCell>
                            <TableCell>
                              {manifest.receiver_signed_at ? 
                                format(new Date(manifest.receiver_signed_at), 'MMM d, yyyy h:mm a') : 'N/A'
                              }
                            </TableCell>
                            <TableCell>
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
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCompleted.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">No completed manifests found matching your criteria</p>
                </div>
              ) : (
                filteredCompleted.map((manifest) => (
                  <Card key={manifest.id} className="border-green-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-green-600">
                            {manifest.manifest_number}
                          </Badge>
                          <Badge className="bg-green-100 text-green-800">Complete</Badge>
                        </div>
                        
                        <h3 className="font-medium">{clientNames[manifest.client_id] || 'Unknown Client'}</h3>
                        
                        <div className="text-sm space-y-1">
                          {manifest.signed_at && (
                            <p className="text-muted-foreground">
                              Initial: {format(new Date(manifest.signed_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          )}
                          {manifest.receiver_signed_at && (
                            <p className="text-muted-foreground">
                              Receiver: {format(new Date(manifest.receiver_signed_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          )}
                        </div>
                        
                        {manifest.acroform_pdf_path && (
                          <ManifestPDFControls
                            manifestId={manifest.id}
                            acroformPdfPath={manifest.acroform_pdf_path}
                            clientEmails={[]}
                            className="mt-2"
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
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