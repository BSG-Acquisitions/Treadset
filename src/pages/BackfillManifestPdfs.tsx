import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEnsureManifestPdf } from "@/hooks/useEnsureManifestPdf";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, FileQuestion, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BackfillManifestPdfs() {
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const { toast } = useToast();
  const ensureManifestPdf = useEnsureManifestPdf();

  // Fetch all completed pickups missing manifest PDFs
  const { data: missingPdfPickups, isLoading, refetch } = useQuery({
    queryKey: ['missing-pdf-pickups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pickups')
        .select(`
          id,
          pickup_date,
          status,
          manifest_pdf_path,
          payment_method,
          payment_status,
          client:clients(company_name)
        `)
        .eq('status', 'completed')
        .is('manifest_pdf_path', null)
        .order('pickup_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const handleBackfillAll = async () => {
    if (!missingPdfPickups || missingPdfPickups.length === 0) return;

    setProcessing(true);
    setProcessedCount(0);
    setFailedCount(0);

    for (const pickup of missingPdfPickups) {
      try {
        await ensureManifestPdf.mutateAsync({ 
          pickup_id: pickup.id,
          force_regenerate: false 
        });
        setProcessedCount(prev => prev + 1);
      } catch (error) {
        console.error(`Failed to process pickup ${pickup.id}:`, error);
        setFailedCount(prev => prev + 1);
      }
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setProcessing(false);
    toast({
      title: "Backfill Complete",
      description: `Processed ${processedCount} pickups. ${failedCount} failed.`,
    });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Backfill Missing Manifest PDFs</h1>
        <p className="text-muted-foreground mt-2">
          Generate manifest PDFs for completed pickups that are missing them
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5" />
            Missing PDFs Summary
          </CardTitle>
          <CardDescription>
            Completed pickups without manifest PDF files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-4xl font-bold">{missingPdfPickups?.length || 0}</div>
              <Badge variant={missingPdfPickups && missingPdfPickups.length > 0 ? "destructive" : "secondary"}>
                {missingPdfPickups && missingPdfPickups.length > 0 ? "Action Required" : "All Good"}
              </Badge>
            </div>

            {processing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing... {processedCount} of {missingPdfPickups?.length}</span>
                </div>
                {failedCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{failedCount} failed</span>
                  </div>
                )}
              </div>
            )}

            {!processing && missingPdfPickups && missingPdfPickups.length > 0 && (
              <Button 
                onClick={handleBackfillAll}
                className="w-full"
              >
                Generate All Missing PDFs
              </Button>
            )}

            {!processing && (!missingPdfPickups || missingPdfPickups.length === 0) && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>All completed pickups have manifest PDFs</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {missingPdfPickups && missingPdfPickups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Affected Pickups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {missingPdfPickups.map((pickup) => (
                <div 
                  key={pickup.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{pickup.client?.company_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(pickup.pickup_date).toLocaleDateString()} • {pickup.payment_method}
                    </div>
                  </div>
                  <Badge variant={pickup.payment_status === 'SUCCEEDED' ? 'default' : 'secondary'}>
                    {pickup.payment_status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
