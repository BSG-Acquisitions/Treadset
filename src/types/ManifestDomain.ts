/**
 * Single Source of Truth for Manifest Data Domain
 * Unified type that bridges Admin UI, Driver UI, and AcroForm outputs
 */

export interface ManifestDomain {
  // Core identifiers
  id: string;
  manifest_number: string;
  organization_id: string;
  
  // References
  client_id: string;
  location_id?: string;
  pickup_id?: string;
  driver_id?: string;
  vehicle_id?: string;
  hauler_id?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  signed_at?: string;
  receiver_signed_at?: string;
  
  // Generator (Client) Data
  generator: {
    name: string;
    mailing_address: string;
    city: string;
    state: string;
    zip: string;
    physical_address?: string;
    physical_city?: string;
    physical_state?: string;
    physical_zip?: string;
    county?: string;
    phone?: string;
    contact_name?: string;
    email?: string;
  };
  
  // Hauler Data
  hauler: {
    id?: string;
    name: string;
    mailing_address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    mi_registration?: string;
    other_id?: string;
  };
  
  // Receiver Data
  receiver: {
    id?: string;
    name: string;
    mailing_address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    mi_registration?: string;
  };
  
  // Tire Counts (Unified - both business and state compliance)
  tires: {
    // Passenger Equivalent Tires (PTE 1:1 ratio)
    pte_off_rim: number;
    pte_on_rim: number;
    
    // Commercial/Truck Tires (PTE 5:1 ratio)
    commercial_17_5_19_5_off: number;
    commercial_17_5_19_5_on: number;
    commercial_22_5_off: number;
    commercial_22_5_on: number;
    
    // Oversized (PTE 15:1 ratio)
    otr_count: number;
    tractor_count: number;
  };
  
  // Calculated Values
  calculated: {
    total_pte: number;
    passenger_car_total: number;
    truck_total: number;
    oversized_total: number;
    gross_weight_lbs: number;
    tare_weight_lbs: number;
    net_weight_lbs: number;
    weight_tons: number;
    volume_yards?: number;
  };
  
  // Signatures
  signatures: {
    generator_signature_path?: string;
    generator_print_name: string;
    generator_date: string;
    generator_time: string;
    
    hauler_signature_path?: string;
    hauler_print_name: string;
    hauler_date: string;
    hauler_time: string;
    
    receiver_signature_path?: string;
    receiver_print_name?: string;
    receiver_date?: string;
    receiver_time?: string;
  };
  
  // Status & Workflow
  status: 'DRAFT' | 'IN_PROGRESS' | 'AWAITING_SIGNATURE' | 'AWAITING_PAYMENT' | 'AWAITING_RECEIVER_SIGNATURE' | 'COMPLETED';
  
  // Payment Information
  payment: {
    method: 'CARD' | 'INVOICE' | 'CASH' | 'CHECK';
    status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'NOT_APPLICABLE';
    amount_paid: number;
    subtotal: number;
    surcharges: number;
    total: number;
    stripe_payment_intent_id?: string;
    receipt_url?: string;
  };
  
  // Additional Data
  vehicle_trailer?: string;
  photos?: string[];
  notes?: string;
  pdf_paths?: {
    overlay_pdf?: string;
    acroform_pdf?: string;
  };
}

/**
 * Input interfaces for different UI contexts
 */
export interface AdminFormInput {
  client_id: string;
  location_id?: string;
  pickup_id?: string;
  driver_id?: string;
  vehicle_id?: string;
  hauler_id?: string;
  
  // Admin can input all tire counts directly
  pte_off_rim: number;
  pte_on_rim: number;
  commercial_17_5_19_5_off: number;
  commercial_17_5_19_5_on: number;
  commercial_22_5_off: number;
  commercial_22_5_on: number;
  otr_count: number;
  tractor_count: number;
  
  weight_tons?: number;
  volume_yards?: number;
  notes?: string;
  
  payment_method?: 'CARD' | 'INVOICE' | 'CASH' | 'CHECK';
  status?: ManifestDomain['status'];
}

export interface DriverFormInput {
  pickup_id: string;
  
  // Field counts from driver completion
  equivalents_off_rim: number; // PTE off rim
  equivalents_on_rim: number;  // PTE on rim
  commercial_17_5_19_5_off: number;
  commercial_17_5_19_5_on: number;
  commercial_22_5_off: number;
  commercial_22_5_on: number;
  otr_count: number;
  tractor_count: number;
  
  // Measurements
  weight_tons?: number;
  volume_yards?: number;
  gross_weight?: number; // Calculated automatically if not provided
  tare_weight?: number; // Defaults to 0.0 unless manually entered
  
  // Entity selections
  generator_id: string;
  hauler_id: string;
  receiver_id: string;
  
  // Print names for signatures
  generator_print_name: string;
  hauler_print_name: string;
  receiver_print_name: string;
  
  notes?: string;
}

/**
 * PTE Calculation Constants
 */
export const PTE_RATIOS = {
  // Passenger tires (1:1 PTE ratio)
  PTE_OFF_RIM: 1,
  PTE_ON_RIM: 1,
  
  // Commercial/truck tires (5:1 PTE ratio)
  COMMERCIAL_17_5_19_5_OFF: 5,
  COMMERCIAL_17_5_19_5_ON: 5,
  COMMERCIAL_22_5_OFF: 5,
  COMMERCIAL_22_5_ON: 5,
  
  // Oversized (15:1 PTE ratio)
  OTR: 15,
  TRACTOR: 15
} as const;

/**
 * Weight Constants (pounds per tire)
 */
export const TIRE_WEIGHTS = {
  PTE_OFF_RIM: 22.47,
  PTE_ON_RIM: 22.47,
  COMMERCIAL_17_5_19_5_OFF: 112.35,
  COMMERCIAL_17_5_19_5_ON: 112.35,
  COMMERCIAL_22_5_OFF: 112.35,
  COMMERCIAL_22_5_ON: 112.35,
  OTR: 337.05,
  TRACTOR: 337.05
} as const;

/**
 * Calculate PTE totals from tire counts
 */
export function calculatePTEValues(tires: ManifestDomain['tires']) {
  const passenger_pte = (tires.pte_off_rim * PTE_RATIOS.PTE_OFF_RIM) + 
                       (tires.pte_on_rim * PTE_RATIOS.PTE_ON_RIM);
                       
  const commercial_pte = (tires.commercial_17_5_19_5_off * PTE_RATIOS.COMMERCIAL_17_5_19_5_OFF) +
                        (tires.commercial_17_5_19_5_on * PTE_RATIOS.COMMERCIAL_17_5_19_5_ON) +
                        (tires.commercial_22_5_off * PTE_RATIOS.COMMERCIAL_22_5_OFF) +
                        (tires.commercial_22_5_on * PTE_RATIOS.COMMERCIAL_22_5_ON);
                        
  const oversized_pte = (tires.otr_count * PTE_RATIOS.OTR) +
                       (tires.tractor_count * PTE_RATIOS.TRACTOR);
                       
  return {
    passenger_pte,
    commercial_pte,
    oversized_pte,
    total_pte: passenger_pte + commercial_pte + oversized_pte
  };
}

/**
 * Calculate weight totals from tire counts
 */
export function calculateWeightValues(tires: ManifestDomain['tires'], tare_weight_lbs: number = 0) {
  const gross_weight_lbs = 
    (tires.pte_off_rim * TIRE_WEIGHTS.PTE_OFF_RIM) +
    (tires.pte_on_rim * TIRE_WEIGHTS.PTE_ON_RIM) +
    (tires.commercial_17_5_19_5_off * TIRE_WEIGHTS.COMMERCIAL_17_5_19_5_OFF) +
    (tires.commercial_17_5_19_5_on * TIRE_WEIGHTS.COMMERCIAL_17_5_19_5_ON) +
    (tires.commercial_22_5_off * TIRE_WEIGHTS.COMMERCIAL_22_5_OFF) +
    (tires.commercial_22_5_on * TIRE_WEIGHTS.COMMERCIAL_22_5_ON) +
    (tires.otr_count * TIRE_WEIGHTS.OTR) +
    (tires.tractor_count * TIRE_WEIGHTS.TRACTOR);
    
  const net_weight_lbs = gross_weight_lbs - tare_weight_lbs;
  const weight_tons = gross_weight_lbs / 2000;
  
  return {
    gross_weight_lbs,
    tare_weight_lbs,
    net_weight_lbs,
    weight_tons
  };
}