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
      // Resolve a URL (signed if needed), then download as Blob for reliable cross-browser behavior
      const url = await resolveFileUrl(path);

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
      try {
        const fallbackUrl = await resolveFileUrl(path);
        window.open(fallbackUrl, '_blank', 'noopener');
      } catch {}
      toast({ title: 'Download failed', description: 'Please allow downloads and try again.', variant: 'destructive' });
    }
  };

  const handleView = async (path: string, title: string) => {
    if (!path) return;
    // Pass the path as-is from the database - don't normalize it
    setCurrentPdfPath(path);
    setCurrentPdfTitle(title);
    setViewerOpen(true);
  };

  const handlePrint = async (path: string) => {
    if (!path) return;

    // Open a print window synchronously (prevents popup blockers)
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      toast({ title: 'Pop-up blocked', description: 'Please allow pop-ups to print.', variant: 'destructive' });
      return;
    }

    // Basic shell so the window is visible quickly
    try {
      printWindow.document.write(
        '<!doctype html><title>Printing…</title>' +
          '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
          '<style>html,body{height:100%;margin:0}body{display:flex;align-items:center;justify-content:center;font:14px system-ui;color:#666}</style>' +
          '<div>Loading PDF…</div>'
      );
      printWindow.document.close();

      const { supabase } = await import('@/integrations/supabase/client');

      const pdfUrl = await resolveFileUrl(path);
      if (!pdfUrl) throw new Error('Could not resolve PDF URL');

      // Fetch as blob to avoid CORS and guarantee printability
      const resp = await fetch(pdfUrl);
      if (!resp.ok) throw new Error('Failed to fetch PDF for printing');
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Write a same-origin HTML that embeds the PDF and self-triggers print.
      // This avoids cross-origin access to iframe.contentWindow (Chrome blocks it for the PDF viewer).
      const html = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Manifest</title>
            <style>
              html, body { height: 100%; margin: 0; }
              iframe { width: 100%; height: 100%; border: 0; }
            </style>
          </head>
          <body>
            <iframe src="${blobUrl}" id="printFrame"></iframe>
            <script>
              // Print after a short delay to allow PDF to render
              window.addEventListener('load', function(){
                setTimeout(function(){
                  try { window.focus(); window.print(); } catch (e) {}
                }, 300);
              });
              window.onafterprint = function(){
                setTimeout(function(){ URL.revokeObjectURL('${blobUrl}'); window.close(); }, 300);
              };
              // Safety cleanup in case onafterprint doesn't fire
              setTimeout(function(){ URL.revokeObjectURL('${blobUrl}'); }, 15000);
            <\/script>
          </body>
        </html>`;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      // Fallback: if the print dialog didn’t appear, navigate to the PDF URL directly
      setTimeout(() => {
        try {
          if (!printWindow.closed) {
            printWindow.location.replace(pdfUrl!);
          }
        } catch {}
      }, 2000);
    } catch (err) {
      console.error('Print failed:', err);
      try { printWindow.close(); } catch {}
      toast({ title: 'Print failed', description: 'Could not open print dialog. Try again.', variant: 'destructive' });
    }
  };

  

  const resolveFileUrl = async (path: string) => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Files are stored WITH "manifests/" prefix as part of the object key
    let pathToTry = (path || '').replace(/^\/+/, '');
    
    // Ensure path starts with "manifests/"
    if (!pathToTry.startsWith('manifests/')) {
      pathToTry = 'manifests/' + pathToTry;
    }

    // Try signed URL
    try {
      const { data } = await supabase.storage
        .from('manifests')
        .createSignedUrl(pathToTry, 60 * 60);
      if (data?.signedUrl) return data.signedUrl;
    } catch (e) {
      console.error('Signed URL failed:', e);
    }

    throw new Error('Could not resolve a valid URL for the PDF');
  };

  const handleOpenTab = async (path: string) => {
    try {
      const url = await resolveFileUrl(path);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      console.error('Open in new tab failed:', e);
      toast({ title: 'Open failed', description: 'Could not open in a new tab.' });
    }
  };

  const handleCopyLink = async (path: string) => {
    try {
      const url = await resolveFileUrl(path);
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