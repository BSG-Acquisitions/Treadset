import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Mail, FileText, Calendar, Eye } from 'lucide-react';
import { useSendManifestEmail } from '@/hooks/useSendManifestEmail';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const handleDownload = async (path: string, filename: string) => {
    if (!path) return;
    
    try {
      // Generate signed URL for download
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.storage
        .from('manifests')
        .createSignedUrl(path, 3600); // 1 hour expiry

      if (error) throw error;
      
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast({
        title: 'Download failed',
        description: 'Unable to download PDF. Opening in new tab instead.',
      });
      // Fallback to opening in new tab
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data } = await supabase.storage
          .from('manifests')
          .createSignedUrl(path, 3600);
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank', 'noopener');
        }
      } catch (fallbackErr) {
        console.error('Fallback failed:', fallbackErr);
      }
    }
  };

  const handleView = async (path: string) => {
    if (!path) return;
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.storage
        .from('manifests')
        .createSignedUrl(path, 3600);
      if (error) throw error;
      setViewerUrl(data.signedUrl);
      setViewerOpen(true);
    } catch (err) {
      toast({ title: 'Preview failed', description: 'Unable to open PDF preview.' });
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
          {viewerUrl ? (
            <object data={viewerUrl} type="application/pdf" className="w-full h-[70vh] rounded-md">
              <p className="text-sm">Your browser cannot display the PDF. Use Download instead.</p>
            </object>
          ) : (
            <div className="text-sm text-muted-foreground">Loading preview...</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};