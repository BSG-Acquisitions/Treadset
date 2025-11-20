import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PdfInlineViewerProps {
  filePath: string; // path inside 'manifests' bucket
  className?: string;
}

export const PdfInlineViewer: React.FC<PdfInlineViewerProps> = ({ filePath, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let cleanupCanvases: HTMLCanvasElement[] = [];

    const renderPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        // Normalize the path - files are stored as "manifests/filename.pdf" in the bucket
        const raw = (filePath || '').replace(/^\/+/, '');
        const normalized = raw.replace(/^manifests\//, ''); // Remove leading "manifests/" since we're already in the manifests bucket

        let pdfUrl: string | null = null;
        let lastError: any = null;

        // Try to get a signed URL directly with the normalized path
        try {
          const { data, error } = await supabase.storage
            .from('manifests')
            .createSignedUrl(normalized, 60 * 60);
          
          if (!error && data?.signedUrl) {
            // Verify the URL is accessible
            const testResp = await fetch(data.signedUrl, { method: 'HEAD' });
            if (testResp.ok) {
              pdfUrl = data.signedUrl;
            }
          }
          if (error) lastError = error;
        } catch (e) { 
          lastError = e;
        }

        if (!pdfUrl) {
          const errorMsg = lastError?.message || 'Object not found';
          console.error('PDF access failed:', errorMsg, 'Path tried:', normalized);
          throw new Error(errorMsg);
        }

        const resp = await fetch(pdfUrl);
        if (!resp.ok) throw new Error('Failed to fetch PDF');
        const arrayBuffer = await resp.arrayBuffer();

        // Lazy-import pdfjs and configure worker path compatible with Vite
        const { GlobalWorkerOptions, getDocument } = await import('pdfjs-dist');
        // @ts-ignore - vite resolves asset URL at build time
        const workerSrc = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default as string;
        GlobalWorkerOptions.workerSrc = workerSrc;

        const loadingTask = getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        if (cancelled) return;
        const container = containerRef.current;
        if (!container) return;

        // Clear old canvases
        container.innerHTML = '';

        // Render all pages sequentially
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.2 });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.marginBottom = '12px';

          const renderContext = { canvasContext: context, viewport } as any;
          await page.render(renderContext).promise;

          if (cancelled) return;
          container.appendChild(canvas);
          cleanupCanvases.push(canvas);
        }
      } catch (e: any) {
        console.error('PDF render error:', e);
        if (!cancelled) setError(e?.message || 'Failed to display PDF');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
      // Remove canvases to free memory
      cleanupCanvases.forEach((c) => c.remove());
      cleanupCanvases = [];
    };
  }, [filePath]);

  return (
    <div className={`w-full h-full overflow-auto ${className}`}> 
      {loading && (
        <div className="text-sm text-muted-foreground">Loading PDF…</div>
      )}
      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  );
};

export default PdfInlineViewer;
