import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Mail, FileText, Calendar, Eye, Printer } from 'lucide-react';
import { useSendManifestEmail } from '@/hooks/useSendManifestEmail';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PdfInlineViewer } from '@/components/PdfInlineViewer';

interface ManifestPDFControlsProps {
  manifestId: string;
  acroformPdfPath?: string;
  initialPdfPath?: string;
  clientEmails?: string[];
  className?: string;
}

export const ManifestPDFControls: React.FC<ManifestPDFControlsProps> = ({
  manifestId,
  acroformPdfPath,
  initialPdfPath,
  clientEmails = [],
  className = ""
}) => {
  const { toast } = useToast();
  const sendEmail = useSendManifestEmail();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPdfPath, setCurrentPdfPath] = useState<string>('');
  const [currentPdfTitle, setCurrentPdfTitle] = useState<string>('');
  

  const handleDownload = async (path: string, filename: string) => {
    if (!path) return;
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      // Use public URL (bucket is public) and fetch as Blob to avoid Chrome cross-origin issues
      const { data: pub } = supabase.storage.from('manifests').getPublicUrl(path);
      const url = pub.publicUrl;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Failed to fetch file');
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    } catch (err) {
      console.error('Download failed:', err);
      toast({ title: 'Download failed', description: 'Please allow downloads and try again.', variant: 'destructive' });
    }
  };

  const handleView = async (path: string, title: string) => {
    if (!path) return;
    setCurrentPdfPath(path);
    setCurrentPdfTitle(title);
    setViewerOpen(true);
  };

  const handlePrint = async (path: string) => {
    if (!path) return;
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Try signed URL first (for private buckets), then fallback to public
      let pdfUrl: string | null = null;
      const { data: signedData, error: signedError } = await supabase.storage
        .from('manifests')
        .createSignedUrl(path, 60 * 60);
      
      if (!signedError && signedData?.signedUrl) {
        pdfUrl = signedData.signedUrl;
      } else {
        // Fallback to public URL
        const { data: pub } = supabase.storage.from('manifests').getPublicUrl(path);
        pdfUrl = pub.publicUrl;
      }
      
      if (!pdfUrl) throw new Error('Could not resolve PDF URL');
      
      // Fetch PDF as blob
      const resp = await fetch(pdfUrl);
      if (!resp.ok) throw new Error('Failed to fetch PDF for printing');
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Open in new window with blob URL
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        // Wait for PDF to fully load before triggering print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            // Clean up blob URL after print dialog closes
            printWindow.onafterprint = () => {
              URL.revokeObjectURL(blobUrl);
              printWindow.close();
            };
          }, 250);
        };
      } else {
        URL.revokeObjectURL(blobUrl);
        toast({ title: 'Print blocked', description: 'Please allow popups to print.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Print failed:', err);
      toast({ title: 'Print failed', description: 'Could not load print dialog.', variant: 'destructive' });
    }
  };

  const resolvePublicUrl = async (path: string) => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: pub } = supabase.storage.from('manifests').getPublicUrl(path);
    return pub.publicUrl;
  };

  const handleOpenTab = async (path: string) => {
    try {
      const url = await resolvePublicUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      console.error('Open in new tab failed:', e);
      toast({ title: 'Open failed', description: 'Could not open in a new tab.' });
    }
  };

  const handleCopyLink = async (path: string) => {
    try {
      const url = await resolvePublicUrl(path);
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'PDF link copied to clipboard.' });
    } catch (e) {
      console.error('Copy link failed:', e);
      toast({ title: 'Copy failed', description: 'Could not copy link.' });
    }
  };

  const handleEmail = async (pdfPathToSend: string, pdfType: string) => {
    if (!pdfPathToSend || clientEmails.length === 0) {
      toast({
        title: 'Email not sent',
        description: 'No client email addresses available.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await sendEmail.mutateAsync({
        to: clientEmails,
        subject: `Manifest PDF - ${pdfType}`,
        messageHtml: `<p>Please find the attached ${pdfType.toLowerCase()} manifest PDF.</p>`,
        pdfPath: pdfPathToSend,
      });
    } catch (error) {
      console.error('Email failed:', error);
    }
  };

  if (!acroformPdfPath && !initialPdfPath) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <Badge variant="outline" className="mb-2">
          <Calendar className="w-3 h-3 mr-1" />
          PDF will be generated when manifest is finalized
        </Badge>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Initial Manifest (Generator + Hauler signatures only) */}
      {initialPdfPath && (
        <>
          <div className="text-sm font-medium text-muted-foreground">
            Initial Manifest (Generator + Hauler):
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">Initial Manifest PDF</div>
                <div className="text-xs text-muted-foreground">Generator & Hauler signatures</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 justify-end w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleView(initialPdfPath, 'Initial Manifest')}
                className="text-xs px-2 py-1.5 touch-target"
              >
                <Eye className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">View</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePrint(initialPdfPath)}
                className="text-xs px-2 py-1.5 touch-target"
              >
                <Printer className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Print</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(initialPdfPath, `manifest-${manifestId}-initial.pdf`)}
                className="text-xs px-2 py-1.5 touch-target"
              >
                <Download className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              {clientEmails.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEmail(initialPdfPath, 'Initial Manifest')}
                  disabled={sendEmail.isPending}
                  className="text-xs px-2 py-1.5 touch-target"
                >
                  <Mail className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">Email</span>
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Final Manifest (All signatures) */}
      {acroformPdfPath && (
        <>
          <div className="text-sm font-medium text-muted-foreground">
            {initialPdfPath ? 'Final Manifest (All Signatures):' : 'State Compliant Manifest:'}
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">Michigan Manifest PDF</div>
                <div className="text-xs text-muted-foreground">
                  {initialPdfPath ? 'Complete with all signatures' : 'View or download manifest'}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 justify-end w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleView(acroformPdfPath, 'Final Manifest')}
                className="text-xs px-2 py-1.5 touch-target"
              >
                <Eye className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">View</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePrint(acroformPdfPath)}
                className="text-xs px-2 py-1.5 touch-target"
              >
                <Printer className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Print</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload(acroformPdfPath, `manifest-${manifestId}-final.pdf`)}
                className="text-xs px-2 py-1.5 touch-target"
              >
                <Download className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleOpenTab(acroformPdfPath)}
                className="text-xs px-2 py-1.5 touch-target hidden sm:inline-flex"
              >
                Open Tab
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyLink(acroformPdfPath)}
                className="text-xs px-2 py-1.5 touch-target hidden sm:inline-flex"
              >
                Copy Link
              </Button>
              {clientEmails.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEmail(acroformPdfPath, 'Final Manifest')}
                  disabled={sendEmail.isPending}
                  className="text-xs px-2 py-1.5 touch-target"
                >
                  <Mail className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">Email</span>
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {sendEmail.isPending && (
        <div className="text-center text-sm text-muted-foreground">
          Sending email...
        </div>
      )}

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="w-[95vw] max-w-none sm:max-w-4xl h-[90vh] sm:h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{currentPdfTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <PdfInlineViewer filePath={currentPdfPath} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};