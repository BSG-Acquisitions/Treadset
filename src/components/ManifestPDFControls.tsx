import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Mail, FileText, Calendar, Eye } from 'lucide-react';
import { useSendManifestEmail } from '@/hooks/useSendManifestEmail';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PdfInlineViewer } from '@/components/PdfInlineViewer';

interface ManifestPDFControlsProps {
  manifestId: string;
  acroformPdfPath?: string;
  clientEmails?: string[];
  className?: string;
}

export const ManifestPDFControls: React.FC<ManifestPDFControlsProps> = ({
  manifestId,
  acroformPdfPath,
  clientEmails = [],
  className = ""
}) => {
  const { toast } = useToast();
  const sendEmail = useSendManifestEmail();
  const [viewerOpen, setViewerOpen] = useState(false);
  

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

  const handleView = async (path: string) => {
    if (!path) return;
    setViewerOpen(true);
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

  if (!acroformPdfPath) {
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
      <div className="text-sm font-medium text-muted-foreground">
        State Compliant Manifest:
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">Michigan Manifest PDF</div>
            <div className="text-xs text-muted-foreground">AcroForm PDF with proper field mapping</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 justify-end w-full sm:w-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleView(acroformPdfPath)}
            className="text-xs px-2 py-1.5 touch-target"
          >
            <Eye className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">View</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownload(acroformPdfPath, `manifest-${manifestId}.pdf`)}
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
              onClick={() => handleEmail(acroformPdfPath, 'Michigan Manifest')}
              disabled={sendEmail.isPending}
              className="text-xs px-2 py-1.5 touch-target"
            >
              <Mail className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Email</span>
            </Button>
          )}
        </div>
      </div>

      {sendEmail.isPending && (
        <div className="text-center text-sm text-muted-foreground">
          Sending email...
        </div>
      )}

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="w-[95vw] max-w-none sm:max-w-4xl h-[90vh] sm:h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Manifest Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <PdfInlineViewer filePath={acroformPdfPath} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};