import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Mail, FileText, Calendar } from 'lucide-react';
import { useSendManifestEmail } from '@/hooks/useSendManifestEmail';
import { useToast } from '@/hooks/use-toast';

interface ManifestPDFControlsProps {
  manifestId: string;
  pdfPath?: string;
  acroformPdfPath?: string;
  clientEmails?: string[];
  className?: string;
}

export const ManifestPDFControls: React.FC<ManifestPDFControlsProps> = ({
  manifestId,
  pdfPath,
  acroformPdfPath,
  clientEmails = [],
  className = ""
}) => {
  const { toast } = useToast();
  const sendEmail = useSendManifestEmail();

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

  const hasPDFs = pdfPath || acroformPdfPath;

  if (!hasPDFs) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <Badge variant="outline" className="mb-2">
          <Calendar className="w-3 h-3 mr-1" />
          PDFs will be generated when manifest is finalized
        </Badge>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm font-medium text-muted-foreground">
        Available Manifest PDFs:
      </div>
      
      {/* Coordinate-based PDF (Legacy) */}
      {pdfPath && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <div>
              <div className="font-medium">Standard Manifest</div>
              <div className="text-xs text-muted-foreground">Coordinate-based PDF</div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDownload(pdfPath, `manifest-${manifestId}-standard.pdf`)}
            >
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
            {clientEmails.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEmail(pdfPath, 'Standard Manifest')}
                disabled={sendEmail.isPending}
              >
                <Mail className="w-3 h-3 mr-1" />
                Email
              </Button>
            )}
          </div>
        </div>
      )}

      {/* AcroForm PDF (State Compliant) */}
      {acroformPdfPath && (
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-600" />
            <div>
              <div className="font-medium">State Compliant Manifest</div>
              <div className="text-xs text-muted-foreground">AcroForm PDF with proper field mapping</div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDownload(acroformPdfPath, `manifest-${manifestId}-acroform.pdf`)}
            >
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
            {clientEmails.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEmail(acroformPdfPath, 'State Compliant Manifest')}
                disabled={sendEmail.isPending}
              >
                <Mail className="w-3 h-3 mr-1" />
                Email
              </Button>
            )}
          </div>
        </div>
      )}

      {sendEmail.isPending && (
        <div className="text-center text-sm text-muted-foreground">
          Sending email...
        </div>
      )}
    </div>
  );
};