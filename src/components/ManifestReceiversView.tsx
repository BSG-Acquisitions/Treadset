import { useEffect, useState } from "react";
import { useManifests } from "@/hooks/useManifests";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReceiverSignatureDialog } from "./ReceiverSignatureDialog";
import { format } from "date-fns";
import { Clock, FileText, Signature } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ManifestPDFControls } from "@/components/ManifestPDFControls";

export const ManifestReceiversView = () => {
  const { data: manifests, isLoading } = useManifests();
  const [selectedManifest, setSelectedManifest] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

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
            client:clients(id, company_name)
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Signature className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Receiver Signatures</h1>
      </div>

      {/* Pending Receiver Signatures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Awaiting Receiver Signature ({pendingList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingList.length === 0 ? (
            <p className="text-gray-500">No manifests awaiting receiver signature</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingList.map((manifest) => (
                <Card key={manifest.id} className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-orange-600">
                          {manifest.manifest_number}
                        </Badge>
                        <Badge variant="secondary">Awaiting Receiver</Badge>
                      </div>
                      
                      <h3 className="font-medium">{manifest.client?.company_name}</h3>
                      
                      {manifest.signed_at && (
                        <p className="text-sm text-gray-500">
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Manifests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-500" />
            Fully Completed Manifests ({completedManifests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedManifests.length === 0 ? (
            <p className="text-gray-500">No fully completed manifests</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedManifests.map((manifest) => (
                <Card key={manifest.id} className="border-green-200">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-green-600">
                          {manifest.manifest_number}
                        </Badge>
                        <Badge className="bg-green-100 text-green-800">Complete</Badge>
                      </div>
                      
                      <h3 className="font-medium">{manifest.client?.company_name}</h3>
                      
                      <div className="text-xs space-y-1">
                        {manifest.signed_at && (
                          <p className="text-gray-500">
                            Initial: {format(new Date(manifest.signed_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                        {manifest.receiver_signed_at && (
                          <p className="text-gray-500">
                            Receiver: {format(new Date(manifest.receiver_signed_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                      </div>
                      {manifest.acroform_pdf_path && (
                        <ManifestPDFControls
                          manifestId={manifest.id}
                          acroformPdfPath={manifest.acroform_pdf_path}
                          clientEmails={[]}
                          className="mt-2"
                        />
                      )}
                    </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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