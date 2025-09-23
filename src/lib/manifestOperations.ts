/**
 * Protected Manifest Operations with Error Boundaries
 * Wraps all manifest operations with structured error handling
 */

import { withErrorBoundary, withTimeout, withRetry, ErrorContext } from "./errorBoundary";
import { generateManifestPDF } from "./pdf/generateManifestPDF";
import { ManifestDomain } from "@/types/ManifestDomain";
import { mapDomainToAcroForm } from "@/mappers/domainToAcroForm";
import { convertToAcroFormFields } from "@/hooks/useAcroFormManifest";
import { supabase } from "@/integrations/supabase/client";

/**
 * Protected manifest creation with comprehensive error handling
 */
export async function createManifestSafely(
  manifestData: any,
  userId?: string
): Promise<{ success: boolean; manifestId?: string; error?: any }> {
  
  const context: ErrorContext = {
    operation: 'create_manifest',
    userId,
    timestamp: new Date().toISOString(),
    metadata: {
      hasClient: !!manifestData.client_id,
      hasLocation: !!manifestData.location_id,
      hasPickup: !!manifestData.pickup_id,
      tireCountSum: (manifestData.pte_off_rim || 0) + (manifestData.otr_count || 0) + (manifestData.tractor_count || 0)
    }
  };

  const result = await withErrorBoundary(async () => {
    // Validate required fields
    if (!manifestData.client_id) {
      throw new Error('Client is required for manifest creation');
    }

    // Resolve organization
    const { data: orgId, error: orgErr } = await supabase.rpc('get_current_user_organization', { org_slug: 'bsg' });
    if (orgErr) throw orgErr;
    if (!orgId) throw new Error('No organization configured for current user');

    // Generate manifest number
    const { data: manifestNumber, error: numberError } = await supabase
      .rpc('generate_manifest_number', { org_id: orgId });
    if (numberError) throw numberError;

    // Prepare manifest data
    const finalManifestData = {
      ...manifestData,
      manifest_number: manifestNumber,
      organization_id: orgId,
    };

    // Insert manifest with timeout
    const manifestQuery = supabase
      .from('manifests')
      .insert(finalManifestData)
      .select()
      .single();
    
    const { data: manifest, error } = await withTimeout(manifestQuery, 15000);

    if (error) throw error;
    return manifest;
  }, context);

  if (result.error) {
    return { success: false, error: result.error };
  }

  return { 
    success: true, 
    manifestId: result.data?.id,
  };
}

/**
 * Protected PDF generation with error handling and retries
 */
export async function generateManifestPDFSafely(
  manifestId: string,
  domainData: ManifestDomain,
  userId?: string
): Promise<{ success: boolean; pdfUrl?: string; pdfPath?: string; error?: any }> {
  
  const context: ErrorContext = {
    operation: 'generate_pdf',
    manifestId,
    userId,
    timestamp: new Date().toISOString(),
    metadata: {
      hasGenerator: !!domainData.generator.name,
      hasHauler: !!domainData.hauler.name,
      hasReceiver: !!domainData.receiver.name,
      totalPTE: domainData.calculated.total_pte
    }
  };

  const result = await withErrorBoundary(async () => {
    // Convert domain to AcroForm
    const acroFormData = mapDomainToAcroForm(domainData);
    const acroFormFields = convertToAcroFormFields(acroFormData);
    
    // Generate PDF with retry logic
    const pdfResult = await withRetry(
      () => withTimeout(
        generateManifestPDF({
          manifestId,
          manifestData: acroFormFields,
          outputPath: `manifests/manifest-${manifestId}-${Date.now()}.pdf`
        }),
        30000 // 30 second timeout for PDF generation
      ),
      {
        maxRetries: 2,
        baseDelayMs: 2000,
        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'PDF_GENERATION_FAILED']
      }
    );

    if (!pdfResult.success) {
      throw new Error(pdfResult.metadata.errorDetails || 'PDF generation failed');
    }

    // Update manifest with PDF path
    const { error: updateError } = await supabase
      .from('manifests')
      .update({ 
        acroform_pdf_path: pdfResult.pdfPath,
        updated_at: new Date().toISOString()
      })
      .eq('id', manifestId);

    if (updateError) throw updateError;

    return pdfResult;
  }, context);

  if (result.error) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    pdfUrl: result.data?.pdfUrl,
    pdfPath: result.data?.pdfPath
  };
}

/**
 * Protected signature upload with validation
 */
export async function saveSignatureSafely(
  signatureBlob: Blob,
  type: 'generator' | 'hauler' | 'receiver',
  manifestId: string,
  userId?: string
): Promise<{ success: boolean; signaturePath?: string; error?: any }> {
  
  const context: ErrorContext = {
    operation: 'save_signature',
    manifestId,
    userId,
    timestamp: new Date().toISOString(),
    metadata: {
      signatureType: type,
      blobSize: signatureBlob.size
    }
  };

  const result = await withErrorBoundary(async () => {
    // Validate signature blob
    if (!signatureBlob || signatureBlob.size === 0) {
      throw new Error('Invalid signature data');
    }

    if (signatureBlob.size > 1024 * 1024) { // 1MB limit
      throw new Error('Signature file too large');
    }

    const fileName = `${type}_signature_${manifestId}_${Date.now()}.png`;
    
    // Upload with timeout
    const { data, error } = await withTimeout(
      supabase.storage
        .from('manifests')
        .upload(`signatures/${fileName}`, signatureBlob, {
          contentType: 'image/png'
        }),
      10000 // 10 second timeout
    );

    if (error) throw error;

    // Normalize path
    const rawPath = (data as any)?.path || (data as any)?.fullPath || (data as any)?.Key || '';
    const normalized = String(rawPath).replace(/^manifests\//, '').replace(/^\/+/, '');
    
    if (!normalized) {
      throw new Error(`Upload returned empty path for ${type} signature`);
    }

    return normalized;
  }, context);

  if (result.error) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    signaturePath: result.data
  };
}

/**
 * Protected manifest update operation
 */
export async function updateManifestSafely(
  manifestId: string,
  updates: any,
  userId?: string
): Promise<{ success: boolean; manifest?: any; error?: any }> {
  
  const context: ErrorContext = {
    operation: 'update_manifest',
    manifestId,
    userId,
    timestamp: new Date().toISOString(),
    metadata: {
      updateFields: Object.keys(updates).join(','),
      hasStatusUpdate: !!updates.status
    }
  };

  const result = await withErrorBoundary(async () => {
    const finalUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const updateQuery = supabase
      .from('manifests')
      .update(finalUpdates)
      .eq('id', manifestId)
      .select()
      .single();
      
    const { data: manifest, error } = await withTimeout(updateQuery, 10000);

    if (error) throw error;
    return manifest;
  }, context);

  if (result.error) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    manifest: result.data
  };
}