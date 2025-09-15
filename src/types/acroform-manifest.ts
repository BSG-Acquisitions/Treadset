// AcroForm-based manifest types for state compliance
export interface AcroFormManifestData {
  // Header fields
  manifest_number: string;
  vehicle_trailer: string;
  
  // Part 1: Generator (Client) Information - State Compliance
  generator_name: string;
  generator_mail_address: string;
  generator_city: string;
  generator_state: string;
  generator_zip: string;
  generator_physical_address: string;
  generator_physical_city: string;
  generator_physical_state: string;
  generator_physical_zip: string;
  generator_county: string;
  generator_phone: string;
  generator_volume_weight: string;
  
  // Individual tire counts for manifest fields
  passenger_car_count?: string;
  truck_count?: string;
  oversized_count?: string;
  generator_date_processed: string;
  generator_signature: string;
  generator_print_name: string;
  generator_date: string;
  
  // Part 2: Hauler Information - State Compliance
  hauler_mi_reg: string;
  hauler_other_id: string;
  hauler_name: string;
  hauler_mail_address: string;
  hauler_city: string;
  hauler_state: string;
  hauler_zip: string;
  hauler_phone: string;
  hauler_signature: string;
  hauler_print_name: string;
  hauler_date: string;
  hauler_gross_weight: string;
  hauler_tare_weight: string;
  hauler_net_weight: string;
  hauler_total_pte: string;
  
  // Part 3: Receiving Location - State Compliance
  receiver_mi_reg: string;
  receiver_name: string;
  receiver_physical_address: string;
  receiver_city: string;
  receiver_state: string;
  receiver_zip: string;
  receiver_phone: string;
  receiver_signature: string;
  receiver_print_name: string;
  receiver_date: string;
  receiver_gross_weight: string;
  receiver_total_pte: string;
  receiver_tare_weight: string;
  receiver_net_weight: string;
}

// Business data for pricing (separate from state compliance)
export interface ManifestBusinessData {
  // Detailed tire breakdown for pricing
  pte_off_rim: number;
  pte_on_rim: number;
  commercial_17_5_19_5_off: number;
  commercial_17_5_19_5_on: number;
  commercial_22_5_off: number;
  commercial_22_5_on: number;
  otr_count: number;
  tractor_count: number;
  
  // Pricing calculations
  unit_prices: {
    pte_off_rim: number;
    pte_on_rim: number;
    commercial_17_5_19_5_off: number;
    commercial_17_5_19_5_on: number;
    commercial_22_5_off: number;
    commercial_22_5_on: number;
    otr: number;
    tractor: number;
  };
  
  subtotal: number;
  surcharges: number;
  total: number;
  
  // Payment info
  payment_method: 'CARD' | 'CHECK' | 'CASH' | 'INVOICE';
  payment_status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  paid_amount: number;
}

export interface CompleteManifestData extends AcroFormManifestData, ManifestBusinessData {
  id: string;
  organization_id: string;
  client_id: string;
  driver_id?: string;
  vehicle_id?: string;
  created_at: string;
  updated_at: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
  pdf_path?: string;
}