import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { convertManifestToAcroForm } from '@/hooks/useManifestIntegration';
import { convertToAcroFormFields } from '@/hooks/useAcroFormManifest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface AcroFormLivePreviewProps {
  manifestId: string;
  overrides?: Partial<{
    pte_off_rim: number;
    pte_on_rim: number;
    commercial_17_5_19_5_off: number;
    commercial_17_5_19_5_on: number;
    commercial_22_5_off: number;
    commercial_22_5_on: number;
    generator_signature_name: string;
    driver_signature_name: string;
    generator_date?: string;
    hauler_date?: string;
  }>;
  className?: string;
}

// Lightweight client-side AcroForm filler for live preview only (no upload)
export const AcroFormLivePreview: React.FC<AcroFormLivePreviewProps> = ({ manifestId, overrides, className }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    let revokedUrl: string | null = null;

    const generate = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Fetch manifest + minimal joins used by integration
        const { data: manifest, error: fetchError } = await supabase
          .from('manifests')
          .select(`*, client:clients(company_name, contact_name, phone)`) 
          .eq('id', manifestId)
          .single();
        if (fetchError) throw fetchError;

        // 2) Build AcroForm data, apply overrides and computed values
        const baseData = convertManifestToAcroForm(manifest);
        const withOverrides = {
          ...baseData,
          // apply incoming overrides to acroform data if relevant
          hauler_total_pte: ((overrides?.pte_off_rim ?? manifest.pte_off_rim ?? 0) + (overrides?.pte_on_rim ?? manifest.pte_on_rim ?? 0)).toString(),
          generator_date: overrides?.generator_date ?? baseData.generator_date ?? today,
          hauler_date: overrides?.hauler_date ?? baseData.hauler_date ?? today,
          receiver_date: baseData.receiver_date ?? today,
        } as any;

        // 3) Map to PDF field names
        const fields = convertToAcroFormFields(withOverrides);

        // 4) Load template from public assets
        const templateRes = await fetch('/manifests/templates/Michigan_Manifest_AcroForm.pdf');
        if (!templateRes.ok) throw new Error('Template not found');
        const templateArray = await templateRes.arrayBuffer();

        // 5) Fill AcroForm fields
        const pdfDoc = await PDFDocument.load(templateArray);
        const form = pdfDoc.getForm();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        Object.entries(fields).forEach(([fieldName, value]) => {
          try {
            const field = form.getTextField(fieldName);
            field.setText((value ?? '').toString());
            field.updateAppearances(font);
          } catch (_) {
            // Ignore fields that don't exist in the template
          }
        });

        // For faster rendering in browser, do not flatten so fields remain selectable
        // form.flatten();

        const pdfBytes = await pdfDoc.save();
        if (revokedUrl) URL.revokeObjectURL(revokedUrl);
        const url = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
        revokedUrl = url;
        setPdfUrl(url);
      } catch (e: any) {
        setError(e?.message || 'Failed to build preview');
      } finally {
        setLoading(false);
      }
    };

    generate();

    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [manifestId, overrides, today]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Live Manifest Preview</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}
        {!loading && error && (
          <div className="text-sm text-destructive">{error}</div>
        )}
        {!loading && pdfUrl && (
          <object data={pdfUrl} type="application/pdf" className="w-full h-[520px] border rounded" aria-label="Manifest PDF Preview">
            <iframe src={pdfUrl} className="w-full h-[520px]" title="Manifest PDF Preview" />
          </object>
        )}
      </CardContent>
    </Card>
  );
};
