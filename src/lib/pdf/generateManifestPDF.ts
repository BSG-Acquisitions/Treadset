/**
 * PDF Generation Adapter with Feature Flag Support
 * Routes between overlay and AcroForm engines based on PDF_ENGINE env flag
 */

import { supabase } from "@/integrations/supabase/client";
import { getCurrentTemplateConfig } from "@/lib/pdf/templateConfig";

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
  : process.env.PDF_ENGINE) || 'acroform'; // Default: AcroForm (overlay removed)

const PILOT_MODE = (typeof window !== 'undefined' 
  ? (window as any).__PILOT_MODE__ 
  : process.env.PILOT_MODE) === 'true';

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
    pilotMode: PILOT_MODE,
    ...data,
    ...(error && { error: error.message, stack: error.stack?.slice(0, 500) })
  };
  
  if (PILOT_MODE) {
    // Enhanced logging for pilot
    console.log('[PDF_ADAPTER][PILOT]', JSON.stringify(logEntry, null, 2));
  } else {
    console.log('[PDF_ADAPTER]', JSON.stringify(logEntry, null, 2));
  }
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
 * Generate PDF using AcroForm engine with template versioning
 */
async function generateAcroFormPDF(request: PDFGenerationRequest): Promise<PDFGenerationResult> {
  const config = getCurrentTemplateConfig();
  
  logPDFEvent('template_config', {
    manifestId: request.manifestId,
    templateVersion: config.version,
    templatePath: config.templatePath
  });

  const { data, error } = await supabase.functions.invoke('generate-acroform-manifest', {
    body: {
      templatePath: config.templatePath,
      manifestData: request.manifestData,  
      manifestId: request.manifestId,
      outputPath: request.outputPath || `manifests/acroform-v${config.version}-${request.manifestId}-${Date.now()}.pdf`
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
 * Generate PDF using overlay engine (DEPRECATED - removed)
 */
async function generateOverlayPDF(request: PDFGenerationRequest): Promise<PDFGenerationResult> {
  // Overlay system has been removed - this is a no-op fallback
  logPDFEvent('overlay_deprecated', {
    manifestId: request.manifestId,
    message: 'Overlay engine called but has been removed - check PDF_ENGINE configuration'
  });

  throw new Error('Overlay PDF engine has been removed. Please use PDF_ENGINE=acroform instead.');
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