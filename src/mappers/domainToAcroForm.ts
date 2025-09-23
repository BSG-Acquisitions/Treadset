/**
 * Domain to AcroForm Mapper v4
 * Converts unified ManifestDomain to exact v4 AcroForm field names
 * Supports auto-copy from Generator Mailing → Physical if Physical is blank
 */

import { ManifestDomain } from "@/types/ManifestDomain";
import { AcroFormManifestData } from "@/types/acroform-manifest";
import { getCurrentTemplateConfig, writeIfExists } from "@/lib/pdf/templateConfig";

/**
 * Map ManifestDomain to AcroForm structure with v4 exact field names
 * Auto-copies Generator Mailing → Physical if Physical is blank
 */
export function mapDomainToAcroForm(domain: ManifestDomain): AcroFormManifestData {
  // Optional auto-copy rule: Mailing → Physical if Physical is blank
  const shouldCopyPhysical = !domain.generator.physical_address || domain.generator.physical_address.trim() === '';
  
  const physicalAddress = shouldCopyPhysical ? domain.generator.mailing_address : domain.generator.physical_address;
  const physicalCity = shouldCopyPhysical ? domain.generator.city : (domain.generator.physical_city || domain.generator.city);
  const physicalState = shouldCopyPhysical ? domain.generator.state : (domain.generator.physical_state || domain.generator.state);
  const physicalZip = shouldCopyPhysical ? domain.generator.zip : (domain.generator.physical_zip || domain.generator.zip);
  return {
    // Header fields
    manifest_number: domain.manifest_number,
    vehicle_trailer: domain.vehicle_trailer || '',
    
    // Part 1: Generator Information - Mailing Address
    generator_name: domain.generator.name,
    generator_mail_address: domain.generator.mailing_address,
    generator_city: domain.generator.city,
    generator_state: domain.generator.state,
    generator_zip: domain.generator.zip,
    generator_county: domain.generator.county || '',
    generator_phone: domain.generator.phone || '',
    
    // Part 1: Generator Information - Physical Address (auto-copied from mailing if blank)
    generator_physical_address: physicalAddress,
    generator_physical_city: physicalCity,
    generator_physical_state: physicalState,
    generator_physical_zip: physicalZip,
    generator_volume_weight: domain.calculated.total_pte.toString(),
    
    // Tire counts for state compliance
    passenger_car_count: domain.calculated.passenger_car_total.toString(),
    truck_count: domain.calculated.truck_total.toString(),
    oversized_count: domain.calculated.oversized_total.toString(),
    
    generator_date_processed: domain.signatures.generator_date,
    generator_signature: domain.signatures.generator_signature_path || '',
    generator_print_name: domain.signatures.generator_print_name,
    generator_date: domain.signatures.generator_date,
    generator_time: domain.signatures.generator_time,
    
    // Part 2: Hauler Information
    hauler_mi_reg: domain.hauler.mi_registration || '',
    hauler_other_id: domain.hauler.other_id || '',
    hauler_name: domain.hauler.name,
    hauler_mail_address: domain.hauler.mailing_address,
    hauler_city: domain.hauler.city,
    hauler_state: domain.hauler.state,
    hauler_zip: domain.hauler.zip,
    hauler_phone: domain.hauler.phone || '',
    hauler_signature: domain.signatures.hauler_signature_path || '',
    hauler_print_name: domain.signatures.hauler_print_name,
    hauler_date: domain.signatures.hauler_date,
    hauler_time: domain.signatures.hauler_time,
    hauler_gross_weight: domain.calculated.gross_weight_lbs.toFixed(1),
    hauler_tare_weight: domain.calculated.tare_weight_lbs.toFixed(1),
    hauler_net_weight: domain.calculated.net_weight_lbs.toFixed(1),
    hauler_total_pte: domain.calculated.total_pte.toString(),
    
    // Part 3: Receiver Information
    receiver_mi_reg: domain.receiver.mi_registration || '',
    receiver_name: domain.receiver.name,
    receiver_physical_address: domain.receiver.mailing_address,
    receiver_city: domain.receiver.city,
    receiver_state: domain.receiver.state,
    receiver_zip: domain.receiver.zip,
    receiver_phone: domain.receiver.phone || '',
    receiver_signature: domain.signatures.receiver_signature_path || '',
    receiver_print_name: domain.signatures.receiver_print_name || '',
    receiver_date: domain.signatures.receiver_date || '',
    receiver_time: domain.signatures.receiver_time || '',
    receiver_gross_weight: domain.calculated.gross_weight_lbs.toFixed(1),
    receiver_total_pte: domain.calculated.total_pte.toString(),
    receiver_tare_weight: domain.calculated.tare_weight_lbs.toFixed(1),
    receiver_net_weight: domain.calculated.net_weight_lbs.toFixed(1)
  };
}

/**
 * Generate mapping table for documentation
 * Maps UI field → Domain field → AcroForm field
 */
export function generateFieldMappingTable(): string {
  const mappings = [
    // Generator section
    { ui: 'client.company_name', domain: 'generator.name', acroform: 'generator_name', notes: 'Client company becomes generator' },
    { ui: 'client.mailing_address', domain: 'generator.mailing_address', acroform: 'generator_mail_address', notes: 'Address normalization' },
    { ui: 'client.city', domain: 'generator.city', acroform: 'generator_city', notes: 'Direct mapping' },
    { ui: 'client.state', domain: 'generator.state', acroform: 'generator_state', notes: 'Direct mapping' },
    { ui: 'client.zip', domain: 'generator.zip', acroform: 'generator_zip', notes: 'Direct mapping' },
    { ui: 'client.county', domain: 'generator.county', acroform: 'generator_county', notes: 'Direct mapping' },
    { ui: 'client.phone', domain: 'generator.phone', acroform: 'generator_phone', notes: 'Direct mapping' },
    
    // Hauler section
    { ui: 'hauler.hauler_name', domain: 'hauler.name', acroform: 'hauler_name', notes: 'Name normalization' },
    { ui: 'hauler.hauler_mailing_address', domain: 'hauler.mailing_address', acroform: 'hauler_mail_address', notes: 'Address normalization' },
    { ui: 'hauler.hauler_city', domain: 'hauler.city', acroform: 'hauler_city', notes: 'Direct mapping' },
    { ui: 'hauler.hauler_state', domain: 'hauler.state', acroform: 'hauler_state', notes: 'Direct mapping' },
    { ui: 'hauler.hauler_zip', domain: 'hauler.zip', acroform: 'hauler_zip', notes: 'Direct mapping' },
    { ui: 'hauler.hauler_phone', domain: 'hauler.phone', acroform: 'hauler_phone', notes: 'Direct mapping' },
    { ui: 'hauler.hauler_mi_reg', domain: 'hauler.mi_registration', acroform: 'hauler_mi_reg', notes: 'Registration field' },
    
    // Receiver section
    { ui: 'receiver.receiver_name', domain: 'receiver.name', acroform: 'receiver_name', notes: 'Name normalization' },
    { ui: 'receiver.receiver_mailing_address', domain: 'receiver.mailing_address', acroform: 'receiver_physical_address', notes: 'Address mapping to physical' },
    { ui: 'receiver.receiver_city', domain: 'receiver.city', acroform: 'receiver_city', notes: 'Direct mapping' },
    { ui: 'receiver.receiver_state', domain: 'receiver.state', acroform: 'receiver_state', notes: 'Direct mapping' },
    { ui: 'receiver.receiver_zip', domain: 'receiver.zip', acroform: 'receiver_zip', notes: 'Direct mapping' },
    { ui: 'receiver.receiver_phone', domain: 'receiver.phone', acroform: 'receiver_phone', notes: 'Direct mapping' },
    
    // Tire counts - Admin vs Driver field name differences
    { ui: 'equivalents_off_rim (driver)', domain: 'tires.pte_off_rim', acroform: 'passenger_car_count (partial)', notes: 'Driver UI uses "equivalents" terminology' },
    { ui: 'pte_off_rim (admin)', domain: 'tires.pte_off_rim', acroform: 'passenger_car_count (partial)', notes: 'Admin UI uses "pte" terminology' },
    { ui: 'equivalents_on_rim (driver)', domain: 'tires.pte_on_rim', acroform: 'passenger_car_count (partial)', notes: 'Combined into single passenger count' },
    { ui: 'pte_on_rim (admin)', domain: 'tires.pte_on_rim', acroform: 'passenger_car_count (partial)', notes: 'Combined into single passenger count' },
    
    // Commercial tires
    { ui: 'commercial_17_5_19_5_off', domain: 'tires.commercial_17_5_19_5_off', acroform: 'truck_count (partial)', notes: 'Combined into truck total' },
    { ui: 'commercial_17_5_19_5_on', domain: 'tires.commercial_17_5_19_5_on', acroform: 'truck_count (partial)', notes: 'Combined into truck total' },
    { ui: 'commercial_22_5_off', domain: 'tires.commercial_22_5_off', acroform: 'truck_count (partial)', notes: 'Combined into truck total' },
    { ui: 'commercial_22_5_on', domain: 'tires.commercial_22_5_on', acroform: 'truck_count (partial)', notes: 'Combined into truck total' },
    
    // Oversized tires
    { ui: 'otr_count', domain: 'tires.otr_count', acroform: 'oversized_count (partial)', notes: 'Combined into oversized total' },
    { ui: 'tractor_count', domain: 'tires.tractor_count', acroform: 'oversized_count (partial)', notes: 'Combined into oversized total' },
    
    // Calculated values
    { ui: 'calculated', domain: 'calculated.total_pte', acroform: 'generator_volume_weight', notes: 'PTE total for state compliance' },
    { ui: 'calculated', domain: 'calculated.total_pte', acroform: 'hauler_total_pte', notes: 'Same PTE value repeated' },
    { ui: 'calculated', domain: 'calculated.total_pte', acroform: 'receiver_total_pte', notes: 'Same PTE value repeated' },
    
    // Weights
    { ui: 'gross_weight (driver)', domain: 'calculated.gross_weight_lbs', acroform: 'hauler_gross_weight', notes: 'Driver input vs calculated' },
    { ui: 'tare_weight (driver)', domain: 'calculated.tare_weight_lbs', acroform: 'hauler_tare_weight', notes: 'Driver input' },
    { ui: 'calculated', domain: 'calculated.net_weight_lbs', acroform: 'hauler_net_weight', notes: 'Gross - tare calculation' },
    
    // Signatures
    { ui: 'generator_print_name', domain: 'signatures.generator_print_name', acroform: 'generator_print_name', notes: 'Direct mapping' },
    { ui: 'hauler_print_name', domain: 'signatures.hauler_print_name', acroform: 'hauler_print_name', notes: 'Direct mapping' },
    { ui: 'receiver_print_name', domain: 'signatures.receiver_print_name', acroform: 'receiver_print_name', notes: 'Direct mapping' },
    
    // Status enums
    { ui: 'status (various)', domain: 'status', acroform: 'N/A', notes: 'Workflow state, not in AcroForm' }
  ];
  
  // Generate Markdown table
  let table = '# Field Mapping Table\n\n';
  table += '| UI Field | Domain Field | AcroForm Field | Notes |\n';
  table += '|----------|--------------|----------------|-------|\n';
  
  mappings.forEach(mapping => {
    table += `| ${mapping.ui} | ${mapping.domain} | ${mapping.acroform} | ${mapping.notes} |\n`;
  });
  
  table += '\n## Key Observations\n\n';
  table += '- **Address ambiguity resolved**: Physical address fields default to mailing address when not specified\n';
  table += '- **Tire count consolidation**: Individual tire types combined into passenger/truck/oversized categories for state compliance\n';
  table += '- **PTE calculation consistency**: Same total PTE appears in generator, hauler, and receiver sections\n';
  table += '- **Field name normalization**: Driver UI "equivalents" = Admin UI "pte" = Domain "pte_off_rim"\n';
  table += '- **Signature path handling**: Storage paths are normalized to relative paths without "manifests/" prefix\n';
  
  return table;
}