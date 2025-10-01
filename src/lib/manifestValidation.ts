/**
 * Manifest Workflow Validation & Error Protection
 * Ensures manifests are generated correctly thousands of times without failure
 */

import { ManifestDomain } from "@/types/ManifestDomain";
import { AcroFormManifestData } from "@/types/acroform-manifest";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Comprehensive manifest domain validation
 */
export function validateManifestDomain(domain: Partial<ManifestDomain>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!domain.manifest_number || domain.manifest_number.trim() === '') {
    errors.push('Manifest number is required');
  }
  
  if (!domain.organization_id) {
    errors.push('Organization ID is required');
  }

  if (!domain.client_id) {
    errors.push('Client ID is required');
  }

  // Generator validation
  if (!domain.generator?.name || domain.generator.name.trim() === '') {
    errors.push('Generator name is required');
  }
  
  if (!domain.generator?.mailing_address || domain.generator.mailing_address.trim() === '') {
    warnings.push('Generator mailing address is missing');
  }

  if (!domain.generator?.city || domain.generator.city.trim() === '') {
    warnings.push('Generator city is missing');
  }

  if (!domain.generator?.state || domain.generator.state.trim() === '') {
    warnings.push('Generator state is missing');
  }

  if (!domain.generator?.zip || domain.generator.zip.trim() === '') {
    warnings.push('Generator zip is missing');
  }

  // Hauler validation
  if (!domain.hauler?.name || domain.hauler.name.trim() === '') {
    errors.push('Hauler name is required');
  }

  if (!domain.hauler?.mailing_address || domain.hauler.mailing_address.trim() === '') {
    warnings.push('Hauler mailing address is missing');
  }

  // Receiver validation
  if (!domain.receiver?.name || domain.receiver.name.trim() === '') {
    warnings.push('Receiver name is missing (may be filled later)');
  }

  // Tire counts validation
  if (!domain.tires) {
    errors.push('Tire counts are required');
  } else {
    const totalTires = Object.values(domain.tires).reduce((sum, count) => sum + (count || 0), 0);
    if (totalTires === 0) {
      warnings.push('No tires recorded in manifest');
    }
  }

  // Calculated values validation
  if (!domain.calculated) {
    errors.push('Calculated values are missing');
  } else {
    if (domain.calculated.total_pte <= 0) {
      warnings.push('Total PTE is zero');
    }
    
    if (domain.calculated.gross_weight_lbs < 0) {
      errors.push('Gross weight cannot be negative');
    }
    
    if (domain.calculated.tare_weight_lbs < 0) {
      errors.push('Tare weight cannot be negative');
    }
    
    if (domain.calculated.net_weight_lbs < 0) {
      errors.push('Net weight cannot be negative');
    }
  }

  // Signatures validation
  if (!domain.signatures) {
    warnings.push('Signature data is missing');
  } else {
    if (!domain.signatures.generator_print_name || domain.signatures.generator_print_name.trim() === '') {
      warnings.push('Generator signature name is missing');
    }
    
    if (!domain.signatures.hauler_print_name || domain.signatures.hauler_print_name.trim() === '') {
      warnings.push('Hauler signature name is missing');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate AcroForm data before PDF generation
 */
export function validateAcroFormData(data: Partial<AcroFormManifestData>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields for state compliance
  if (!data.manifest_number || data.manifest_number.trim() === '') {
    errors.push('Manifest number is required for AcroForm');
  }

  if (!data.generator_name || data.generator_name.trim() === '') {
    errors.push('Generator name is required for AcroForm');
  }

  if (!data.hauler_name || data.hauler_name.trim() === '') {
    errors.push('Hauler name is required for AcroForm');
  }

  // Validate numeric fields
  if (data.generator_volume_weight && isNaN(Number(data.generator_volume_weight))) {
    errors.push('Generator volume/weight must be numeric');
  }

  if (data.hauler_gross_weight && isNaN(Number(data.hauler_gross_weight))) {
    errors.push('Hauler gross weight must be numeric');
  }

  if (data.hauler_tare_weight && isNaN(Number(data.hauler_tare_weight))) {
    errors.push('Hauler tare weight must be numeric');
  }

  if (data.hauler_net_weight && isNaN(Number(data.hauler_net_weight))) {
    errors.push('Hauler net weight must be numeric');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitize and normalize manifest data
 * Ensures all required fields have valid values
 */
export function sanitizeManifestDomain(domain: Partial<ManifestDomain>): ManifestDomain {
  const sanitized: ManifestDomain = {
    // Core identifiers with fallbacks
    id: domain.id || '',
    manifest_number: domain.manifest_number?.trim() || 'PENDING',
    organization_id: domain.organization_id || '',
    
    // References
    client_id: domain.client_id || '',
    location_id: domain.location_id,
    pickup_id: domain.pickup_id,
    driver_id: domain.driver_id,
    vehicle_id: domain.vehicle_id,
    hauler_id: domain.hauler_id,
    
    // Timestamps
    created_at: domain.created_at || new Date().toISOString(),
    updated_at: domain.updated_at || new Date().toISOString(),
    signed_at: domain.signed_at,
    receiver_signed_at: domain.receiver_signed_at,
    
    // Generator with defaults
    generator: {
      name: domain.generator?.name?.trim() || '',
      mailing_address: domain.generator?.mailing_address?.trim() || '',
      city: domain.generator?.city?.trim() || '',
      state: domain.generator?.state?.trim() || '',
      zip: domain.generator?.zip?.trim() || '',
      physical_address: domain.generator?.physical_address?.trim(),
      physical_city: domain.generator?.physical_city?.trim(),
      physical_state: domain.generator?.physical_state?.trim(),
      physical_zip: domain.generator?.physical_zip?.trim(),
      county: domain.generator?.county?.trim(),
      phone: domain.generator?.phone?.trim(),
      contact_name: domain.generator?.contact_name?.trim(),
      email: domain.generator?.email?.trim()
    },
    
    // Hauler with defaults
    hauler: {
      id: domain.hauler?.id,
      name: domain.hauler?.name?.trim() || '',
      mailing_address: domain.hauler?.mailing_address?.trim() || '',
      city: domain.hauler?.city?.trim() || '',
      state: domain.hauler?.state?.trim() || '',
      zip: domain.hauler?.zip?.trim() || '',
      phone: domain.hauler?.phone?.trim(),
      mi_registration: domain.hauler?.mi_registration?.trim(),
      other_id: domain.hauler?.other_id?.trim()
    },
    
    // Receiver with defaults
    receiver: {
      id: domain.receiver?.id,
      name: domain.receiver?.name?.trim() || '',
      mailing_address: domain.receiver?.mailing_address?.trim() || '',
      city: domain.receiver?.city?.trim() || '',
      state: domain.receiver?.state?.trim() || '',
      zip: domain.receiver?.zip?.trim() || '',
      phone: domain.receiver?.phone?.trim(),
      mi_registration: domain.receiver?.mi_registration?.trim()
    },
    
    // Tire counts with defaults
    tires: {
      pte_off_rim: Math.max(0, domain.tires?.pte_off_rim || 0),
      pte_on_rim: Math.max(0, domain.tires?.pte_on_rim || 0),
      commercial_17_5_19_5_off: Math.max(0, domain.tires?.commercial_17_5_19_5_off || 0),
      commercial_17_5_19_5_on: Math.max(0, domain.tires?.commercial_17_5_19_5_on || 0),
      commercial_22_5_off: Math.max(0, domain.tires?.commercial_22_5_off || 0),
      commercial_22_5_on: Math.max(0, domain.tires?.commercial_22_5_on || 0),
      otr_count: Math.max(0, domain.tires?.otr_count || 0),
      tractor_count: Math.max(0, domain.tires?.tractor_count || 0)
    },
    
    // Calculated values with defaults
    calculated: {
      total_pte: Math.max(0, domain.calculated?.total_pte || 0),
      passenger_car_total: Math.max(0, domain.calculated?.passenger_car_total || 0),
      truck_total: Math.max(0, domain.calculated?.truck_total || 0),
      oversized_total: Math.max(0, domain.calculated?.oversized_total || 0),
      gross_weight_lbs: Math.max(0, domain.calculated?.gross_weight_lbs || 0),
      tare_weight_lbs: Math.max(0, domain.calculated?.tare_weight_lbs || 0),
      net_weight_lbs: Math.max(0, domain.calculated?.net_weight_lbs || 0),
      weight_tons: Math.max(0, domain.calculated?.weight_tons || 0),
      volume_yards: domain.calculated?.volume_yards
    },
    
    // Signatures with defaults
    signatures: {
      generator_signature_path: domain.signatures?.generator_signature_path,
      generator_print_name: domain.signatures?.generator_print_name?.trim() || '',
      generator_date: domain.signatures?.generator_date || new Date().toISOString().split('T')[0],
      generator_time: domain.signatures?.generator_time || new Date().toTimeString().split(' ')[0],
      hauler_signature_path: domain.signatures?.hauler_signature_path,
      hauler_print_name: domain.signatures?.hauler_print_name?.trim() || '',
      hauler_date: domain.signatures?.hauler_date || new Date().toISOString().split('T')[0],
      hauler_time: domain.signatures?.hauler_time || new Date().toTimeString().split(' ')[0],
      receiver_signature_path: domain.signatures?.receiver_signature_path,
      receiver_print_name: domain.signatures?.receiver_print_name?.trim(),
      receiver_date: domain.signatures?.receiver_date,
      receiver_time: domain.signatures?.receiver_time
    },
    
    // Status with default
    status: domain.status || 'DRAFT',
    
    // Payment with defaults
    payment: {
      method: domain.payment?.method || 'INVOICE',
      status: domain.payment?.status || 'PENDING',
      amount_paid: Math.max(0, domain.payment?.amount_paid || 0),
      subtotal: Math.max(0, domain.payment?.subtotal || 0),
      surcharges: Math.max(0, domain.payment?.surcharges || 0),
      total: Math.max(0, domain.payment?.total || 0),
      stripe_payment_intent_id: domain.payment?.stripe_payment_intent_id,
      receipt_url: domain.payment?.receipt_url
    },
    
    // Additional data
    vehicle_trailer: domain.vehicle_trailer?.trim(),
    photos: domain.photos || [],
    notes: domain.notes?.trim(),
    pdf_paths: domain.pdf_paths || {}
  };

  return sanitized;
}

/**
 * Sanitize AcroForm data before PDF generation
 */
export function sanitizeAcroFormData(data: Partial<AcroFormManifestData>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  // Helper to safely convert to string with fallback
  const safeString = (value: any, fallback: string = ''): string => {
    if (value === null || value === undefined) return fallback;
    return String(value).trim();
  };

  // Map all fields with sanitization
  Object.keys(data).forEach(key => {
    const value = (data as any)[key];
    sanitized[key] = safeString(value);
  });

  return sanitized;
}

/**
 * Log validation results for debugging
 */
export function logValidationResults(context: string, result: ValidationResult): void {
  if (!result.isValid) {
    console.error(`[${context}] Validation failed:`, {
      errors: result.errors,
      warnings: result.warnings
    });
  } else if (result.warnings.length > 0) {
    console.warn(`[${context}] Validation passed with warnings:`, result.warnings);
  } else {
    console.log(`[${context}] Validation passed successfully`);
  }
}
