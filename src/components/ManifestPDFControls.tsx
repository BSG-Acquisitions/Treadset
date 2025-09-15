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
      
      <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <div>
            <div className="font-medium">Michigan Manifest PDF</div>
            <div className="text-xs text-muted-foreground">AcroForm PDF with proper field mapping</div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleView(acroformPdfPath)}
          >
            <Eye className="w-3 h-3 mr-1" />
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownload(acroformPdfPath, `manifest-${manifestId}.pdf`)}
          >
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenTab(acroformPdfPath)}
          >
            Open Tab
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCopyLink(acroformPdfPath)}
          >
            Copy Link
          </Button>
          {clientEmails.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEmail(acroformPdfPath, 'Michigan Manifest')}
              disabled={sendEmail.isPending}
            >
              <Mail className="w-3 h-3 mr-1" />
              Email
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
        <DialogContent className="max-w-4xl w-[90vw] h-[85vh]">
          <DialogHeader>
            <DialogTitle>Manifest Preview</DialogTitle>
          </DialogHeader>
          <PdfInlineViewer filePath={acroformPdfPath} />
        </DialogContent>
      </Dialog>
    </div>
  );
};