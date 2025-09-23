/**
 * Driver Form to Domain Mapper
 * Converts driver UI form data to unified ManifestDomain
 */

import { ManifestDomain, DriverFormInput, calculatePTEValues, calculateWeightValues } from "@/types/ManifestDomain";
import { dataSource } from "@/lib/dataSource";

export interface DriverMappingContext {
  user_id: string;
  organization_id: string;
  manifest_number: string;
  pickup_data?: any; // Pickup record for reference
}

/**
 * Map driver form input to ManifestDomain
 */
export async function mapDriverFormToDomain(
  input: DriverFormInput, 
  context: DriverMappingContext
): Promise<ManifestDomain> {
  
  // Fetch related entities based on driver selections
  const [generator, hauler, receiver] = await Promise.all([
    dataSource.getClient(input.generator_id), // Generator is typically a client
    dataSource.getHauler(input.hauler_id),
    dataSource.getReceiver(input.receiver_id)
  ]);

  if (!generator) {
    throw new Error(`Generator not found: ${input.generator_id}`);
  }
  if (!hauler) {
    throw new Error(`Hauler not found: ${input.hauler_id}`);
  }
  if (!receiver) {
    throw new Error(`Receiver not found: ${input.receiver_id}`);
  }

  // Map driver field names to standard tire counts
  const tires = {
    pte_off_rim: input.equivalents_off_rim || 0,
    pte_on_rim: input.equivalents_on_rim || 0,
    commercial_17_5_19_5_off: input.commercial_17_5_19_5_off || 0,
    commercial_17_5_19_5_on: input.commercial_17_5_19_5_on || 0,
    commercial_22_5_off: input.commercial_22_5_off || 0,
    commercial_22_5_on: input.commercial_22_5_on || 0,
    otr_count: input.otr_count || 0,
    tractor_count: input.tractor_count || 0
  };

  // Calculate derived values
  const pteValues = calculatePTEValues(tires);
  const weightValues = calculateWeightValues(tires, input.tare_weight);
  
  // Generate timestamps
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false });

  return {
    id: '', // Will be generated on save
    manifest_number: context.manifest_number,
    organization_id: context.organization_id,
    
    // References
    client_id: input.generator_id, // Generator becomes the client
    location_id: context.pickup_data?.location_id,
    pickup_id: input.pickup_id,
    driver_id: context.user_id,
    vehicle_id: context.pickup_data?.vehicle_id,
    hauler_id: input.hauler_id,
    
    // Timestamps
    created_at: now,
    updated_at: now,
    signed_at: now, // Driver completion means signatures captured
    
    // Generator (Client) Data - populated from selected generator
    generator: {
      name: generator.company_name,
      mailing_address: generator.mailing_address || '',
      city: generator.city || '',
      state: generator.state || '',
      zip: generator.zip || '',
      physical_address: generator.mailing_address || '', // Simplified
      physical_city: generator.city || '',
      physical_state: generator.state || '',
      physical_zip: generator.zip || '',
      county: generator.county || '',
      phone: generator.phone || '',
      contact_name: generator.contact_name || '',
      email: generator.email || ''
    },
    
    // Hauler Data
    hauler: {
      id: hauler.id,
      name: hauler.hauler_name,
      mailing_address: hauler.hauler_mailing_address || '',
      city: hauler.hauler_city || '',
      state: hauler.hauler_state || '',
      zip: hauler.hauler_zip || '',
      phone: hauler.hauler_phone || '',
      mi_registration: hauler.hauler_mi_reg || '',
      other_id: ''
    },
    
    // Receiver Data
    receiver: {
      id: receiver.id,
      name: receiver.receiver_name,
      mailing_address: receiver.receiver_mailing_address || '',
      city: receiver.receiver_city || '',
      state: receiver.receiver_state || '',
      zip: receiver.receiver_zip || '',
      phone: receiver.receiver_phone || '',
      mi_registration: ''
    },
    
    // Tire Counts
    tires,
    
    // Calculated Values (driver provides actual measurements)
    calculated: {
      total_pte: pteValues.total_pte,
      passenger_car_total: tires.pte_off_rim + tires.pte_on_rim,
      truck_total: tires.commercial_17_5_19_5_off + tires.commercial_17_5_19_5_on + 
                  tires.commercial_22_5_off + tires.commercial_22_5_on,
      oversized_total: tires.otr_count + tires.tractor_count,
      gross_weight_lbs: input.gross_weight,
      tare_weight_lbs: input.tare_weight,
      net_weight_lbs: input.gross_weight - input.tare_weight,
      weight_tons: (input.gross_weight / 2000),
      volume_yards: input.volume_yards
    },
    
    // Signatures (from driver form)
    signatures: {
      generator_print_name: input.generator_print_name,
      generator_date: today,
      generator_time: timeNow,
      hauler_print_name: input.hauler_print_name,
      hauler_date: today,
      hauler_time: timeNow,
      receiver_print_name: input.receiver_print_name,
      receiver_date: today,
      receiver_time: timeNow
    },
    
    // Status & Workflow
    status: 'AWAITING_RECEIVER_SIGNATURE',
    
    // Payment Information (defaults)
    payment: {
      method: 'INVOICE',
      status: 'PENDING',
      amount_paid: 0,
      subtotal: 0,
      surcharges: 0,
      total: 0
    },
    
    // Additional Data
    vehicle_trailer: context.pickup_data?.vehicle_id ? `V-${context.pickup_data.vehicle_id}` : '',
    photos: [],
    notes: input.notes,
    pdf_paths: {}
  };
}