/**
 * Admin Form to Domain Mapper
 * Converts admin UI form data to unified ManifestDomain
 */

import { ManifestDomain, AdminFormInput, calculatePTEValues, calculateWeightValues } from "@/types/ManifestDomain";
import { dataSource } from "@/lib/dataSource";

export interface AdminMappingContext {
  user_id?: string;
  organization_id: string;
  manifest_number?: string;
}

/**
 * Map admin form input to ManifestDomain
 */
export async function mapAdminFormToDomain(
  input: AdminFormInput, 
  context: AdminMappingContext
): Promise<ManifestDomain> {
  
  // Fetch related entities
  const [client, location, hauler] = await Promise.all([
    dataSource.getClient(input.client_id),
    input.location_id ? dataSource.getClient(input.location_id) : null, // Note: location lookup may need different endpoint
    input.hauler_id ? dataSource.getHauler(input.hauler_id) : null
  ]);

  if (!client) {
    throw new Error(`Client not found: ${input.client_id}`);
  }

  // Build tire counts structure
  const tires = {
    pte_off_rim: input.pte_off_rim || 0,
    pte_on_rim: input.pte_on_rim || 0,
    commercial_17_5_19_5_off: input.commercial_17_5_19_5_off || 0,
    commercial_17_5_19_5_on: input.commercial_17_5_19_5_on || 0,
    commercial_22_5_off: input.commercial_22_5_off || 0,
    commercial_22_5_on: input.commercial_22_5_on || 0,
    otr_count: input.otr_count || 0,
    tractor_count: input.tractor_count || 0
  };

  // Calculate derived values
  const pteValues = calculatePTEValues(tires);
  const weightValues = calculateWeightValues(tires);
  
  // Generate timestamps
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false });

  return {
    id: '', // Will be generated on save
    manifest_number: context.manifest_number || `ADMIN-${Date.now()}`,
    organization_id: context.organization_id,
    
    // References
    client_id: input.client_id,
    location_id: input.location_id,
    pickup_id: input.pickup_id,
    driver_id: input.driver_id || context.user_id,
    vehicle_id: input.vehicle_id,
    hauler_id: input.hauler_id,
    
    // Timestamps
    created_at: now,
    updated_at: now,
    signed_at: input.status === 'COMPLETED' ? now : undefined,
    
    // Generator (Client) Data
    generator: {
      name: client.company_name,
      mailing_address: client.mailing_address || '',
      city: client.city || '',
      state: client.state || '',
      zip: client.zip || '',
      physical_address: client.mailing_address || '', // Simplified - use same as mailing
      physical_city: client.city || '',
      physical_state: client.state || '',
      physical_zip: client.zip || '',
      county: client.county || '',
      phone: client.phone || '',
      contact_name: client.contact_name || '',
      email: client.email || ''
    },
    
    // Hauler Data
    hauler: hauler ? {
      id: hauler.id,
      name: hauler.hauler_name,
      mailing_address: hauler.hauler_mailing_address || '',
      city: hauler.hauler_city || '',
      state: hauler.hauler_state || '',
      zip: hauler.hauler_zip || '',
      phone: hauler.hauler_phone || '',
      mi_registration: hauler.hauler_mi_reg || '',
      other_id: ''
    } : {
      name: '',
      mailing_address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      mi_registration: '',
      other_id: ''
    },
    
    // Receiver Data (empty for admin - will be filled later)
    receiver: {
      name: '',
      mailing_address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      mi_registration: ''
    },
    
    // Tire Counts
    tires,
    
    // Calculated Values
    calculated: {
      total_pte: pteValues.total_pte,
      passenger_car_total: tires.pte_off_rim + tires.pte_on_rim,
      truck_total: tires.commercial_17_5_19_5_off + tires.commercial_17_5_19_5_on + 
                  tires.commercial_22_5_off + tires.commercial_22_5_on,
      oversized_total: tires.otr_count + tires.tractor_count,
      gross_weight_lbs: weightValues.gross_weight_lbs,
      tare_weight_lbs: weightValues.tare_weight_lbs,
      net_weight_lbs: weightValues.net_weight_lbs,
      weight_tons: input.weight_tons || weightValues.weight_tons,
      volume_yards: input.volume_yards
    },
    
    // Signatures (empty for admin entry)
    signatures: {
      generator_print_name: client.contact_name || 'Generator Representative',
      generator_date: today,
      generator_time: timeNow,
      hauler_print_name: hauler?.hauler_name || 'Hauler Representative',
      hauler_date: today,
      hauler_time: timeNow
    },
    
    // Status & Workflow
    status: input.status || 'DRAFT',
    
    // Payment Information (defaults for admin)
    payment: {
      method: input.payment_method || 'INVOICE',
      status: 'PENDING',
      amount_paid: 0,
      subtotal: 0,
      surcharges: 0,
      total: 0
    },
    
    // Additional Data
    vehicle_trailer: input.vehicle_id ? `V-${input.vehicle_id}` : '',
    photos: [],
    notes: input.notes,
    pdf_paths: {}
  };
}