/**
 * PDF Generation Adapter with Feature Flag Support
 * Routes between overlay and AcroForm engines based on PDF_ENGINE env flag
 */

import { supabase } from "@/integrations/supabase/client";

export interface PDFGenerationRequest {
  manifestId: string;
  manifestData: any;
  overrides?: Record<string, any>;
  outputPath?: string;
}

export interface PDFGenerationResult {
  success: boolean;
  pdfUrl?: string;
  pdfPath?: string;
  engine: 'overlay' | 'acroform';
  metadata: {
    elapsedMs: number;
    payloadHash: string;
    errorDetails?: string;
  };
}

// Runtime configuration
const PDF_ENGINE = (typeof window !== 'undefined' 
  ? (window as any).__PDF_ENGINE__ 
  : process.env.PDF_ENGINE) || 'overlay'; // Default: current behavior

const USE_REAL_DATA = (typeof window !== 'undefined' 
  ? (window as any).__USE_REAL_DATA__ 
  : process.env.USE_REAL_DATA) === 'true';

/**
 * Generate a simple hash for payload shape validation
 */
function generatePayloadHash(data: any): string {
  const keys = Object.keys(data || {}).sort().join(',');
  const valueTypes = Object.values(data || {}).map(v => typeof v).join(',');
  return `keys:${keys.length};types:${valueTypes.slice(0, 50)}`;
}

/**
 * Structured logging for PDF generation events
 */
function logPDFEvent(event: string, data: any, error?: Error) {
  const logEntry = {
    event: `pdf_generation_${event}`,
    timestamp: new Date().toISOString(),
    engine: PDF_ENGINE,
    useRealData: USE_REAL_DATA,
    ...data,
    ...(error && { error: error.message, stack: error.stack?.slice(0, 500) })
  };
  
  console.log('[PDF_ADAPTER]', JSON.stringify(logEntry, null, 2));
}

/**
 * Route PDF generation to overlay or AcroForm engine based on feature flag
 */
export async function generateManifestPDF(request: PDFGenerationRequest): Promise<PDFGenerationResult> {
  const startTime = Date.now();
  const payloadHash = generatePayloadHash(request.manifestData);
  
  logPDFEvent('start', {
    manifestId: request.manifestId,
    payloadHash,
    engineSelected: PDF_ENGINE,
    hasOverrides: !!request.overrides
  });

  try {
    let result: PDFGenerationResult;

    if (PDF_ENGINE === 'acroform') {
      result = await generateAcroFormPDF(request);
    } else {
      result = await generateOverlayPDF(request);
    }

    const elapsedMs = Date.now() - startTime;
    
    logPDFEvent('success', {
      manifestId: request.manifestId,
      engine: result.engine,
      elapsedMs,
      pdfPath: result.pdfPath?.slice(-50) // Last 50 chars for privacy
    });

    return {
      ...result,
      metadata: {
        elapsedMs,
        payloadHash
      }
    };

  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    
    logPDFEvent('error', {
      manifestId: request.manifestId,
      elapsedMs,
      payloadHash
    }, error as Error);

    return {
      success: false,
      engine: PDF_ENGINE as 'overlay' | 'acroform',
      metadata: {
        elapsedMs,
        payloadHash,
        errorDetails: (error as Error).message
      }
    };
  }
}

/**
 * Generate PDF using AcroForm engine
 */
async function generateAcroFormPDF(request: PDFGenerationRequest): Promise<PDFGenerationResult> {
  const { data, error } = await supabase.functions.invoke('generate-acroform-manifest', {
    body: {
      templatePath: 'Michigan_Manifest_AcroForm.pdf',
      manifestData: request.manifestData,  
      manifestId: request.manifestId,
      outputPath: request.outputPath || `manifests/acroform-${request.manifestId}-${Date.now()}.pdf`
    }
  });

  if (error) throw error;
  if (!data?.pdfUrl) throw new Error('AcroForm engine returned no PDF URL');

  return {
    success: true,
    pdfUrl: data.pdfUrl,
    pdfPath: data.pdfPath,
    engine: 'acroform',
    metadata: { elapsedMs: 0, payloadHash: '' } // Will be filled by caller
  };
}

/**
 * Generate PDF using overlay engine (current/legacy)
 */
async function generateOverlayPDF(request: PDFGenerationRequest): Promise<PDFGenerationResult> {
  const { data, error } = await supabase.functions.invoke('generate-manifest-pdf', {
    body: {
      templateName: 'michigan_manifest',
      version: 'v1',
      overlayData: request.manifestData,
      manifestId: request.manifestId
    }
  });

  if (error) throw error;
  if (!data?.publicUrl) throw new Error('Overlay engine returned no PDF URL');

  return {
    success: true,
    pdfUrl: data.publicUrl,
    pdfPath: data.pdfPath,
    engine: 'overlay',
    metadata: { elapsedMs: 0, payloadHash: '' } // Will be filled by caller
  };
}

/**
 * Get current PDF engine configuration
 */
export function getPDFEngineConfig() {
  return {
    engine: PDF_ENGINE,
    useRealData: USE_REAL_DATA,
    isClientSide: typeof window !== 'undefined'
  };
}