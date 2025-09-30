/**
 * PDF Template Configuration for AcroForm Manifests
 * Supports multiple template versions with field mapping
 */

export interface PDFTemplateConfig {
  version: number;
  templatePath: string;
  fieldMapping: Record<string, string>;
  description: string;
}

// Runtime configuration
export const PDF_TEMPLATE_VERSION = (typeof window !== 'undefined' 
  ? (window as any).__PDF_TEMPLATE_VERSION__ 
  : process.env.PDF_TEMPLATE_VERSION) || '4'; // Default to v4

// Template configurations
export const TEMPLATE_CONFIGS: Record<string, PDFTemplateConfig> = {
  '3': {
    version: 3,
    templatePath: 'Michigan_Manifest_AcroForm.pdf',
    description: 'Legacy v3 template with typos (kept for rollback)',
    fieldMapping: {
      // Header fields
      'manifest_number': 'MANIFEST_#',
      'vehicle_trailer': 'VEHICLETRAILER',
      
      // Generator fields (v3 field names with typos preserved)
      'generator_name': 'Generator_Name',
      'generator_mail_address': 'Generator_Mailing_Address',
      'generator_city': 'Generator_City',
      'generator_state': 'Generator_State',
      'generator_zip': 'Generator_Zip',
      'generator_physical_address': 'PHYSICAL_ADDRESS_WHERE_TIRES_WERE_REMOVED',
      'generator_physical_city': 'PHYSICAL_City',
      'generator_physical_state': 'PHYSICAL_State',
      'generator_physical_zip': 'PHYSICAL_Zip',
      'generator_county': 'Generator_County',
      'generator_phone': 'Generator_Phone',
      
      // Hauler fields
      'hauler_mi_reg': 'MI_SCRAP_TIR _HAULER_REG_#', // Preserves v3 typo
      'hauler_other_id': 'Collection_Site_Reg_#',
      'hauler_name': 'Hauler_Name',
      'hauler_mail_address': 'Hauler_Address',
      'hauler_city': 'Hauler_City',
      'hauler_state': 'Hauler_State',
      'hauler_zip': 'Hauler_Zip',
      'hauler_phone': 'Hauler_Phone',
      
      // Receiver fields (v3 typos preserved)
      'receiver_name': 'Receiver_Name',
      'receiver_physical_address': 'Receiver_Address',
      'receiver_city': 'Receiver_City',
      'receiver_state': 'Reciever_State', // Preserves v3 typo
      'receiver_zip': 'Receiver_Zip',
      'receiver_phone': 'Reciever_Phone', // Preserves v3 typo
      
      // Weights/Tires
      'passenger_car_count': 'Passenger_Car',
      'truck_count': 'Truck',
      'oversized_count': 'Oversized',
      'generator_volume_weight': 'Passenger tire equivalents',
      'hauler_gross_weight': 'Gross',
      'hauler_tare_weight': 'Tare',
      'hauler_net_weight': 'Net_Weight',
      'hauler_total_pte': 'Passenger tire equivalents',
      
      // Signatures
      'generator_signature': 'Generator_Signature',
      'hauler_signature': 'Hauler_Signature',
      'receiver_signature': 'Receiver_Signature',
      'generator_print_name': 'Generator_Print_Name',
      'hauler_print_name': 'Hauler_Print_Name',
      'receiver_print_name': 'Processor_Print_Name',
      'generator_date': 'Generator_Date',
      'hauler_date': 'Hauler_Date',
      'receiver_date': 'Processor_Date'
    }
  },
  
  '4': {
    version: 4,
    templatePath: 'Michigan_Manifest_AcroForm_V4.pdf', // Use actual filename in storage
    description: 'New v4 template with corrected field names',
    fieldMapping: {
      // Header fields - exact v4 keys
      'manifest_number': 'Manifest_Number',
      'vehicle_trailer': 'Vehicle_Trailer',
      
      // Generator mailing address
      'generator_name': 'Generator_Name',
      'generator_mail_address': 'Generator_Mailing_Address',
      'generator_city': 'Generator_City',
      'generator_state': 'Generator_State',
      'generator_zip': 'Generator_Zip',
      'generator_county': 'Generator_County',
      'generator_phone': 'Generator_Phone',
      
      // Generator physical address (separate fields in v4)
      'generator_physical_address': 'Physical_Mailing_Address',
      'generator_physical_city': 'Physical_City',
      'generator_physical_state': 'Physical_State',
      'generator_physical_zip': 'Physical_Zip',
      
      // Hauler fields - corrected names
      'hauler_name': 'Hauler_Name',
      'hauler_mail_address': 'Hauler_Address',
      'hauler_city': 'Hauler_City',
      'hauler_state': 'Hauler_State',
      'hauler_zip': 'Hauler_Zip',
      'hauler_phone': 'Hauler_Phone',
      'hauler_mi_reg': 'MI_SCRAP_TIRE_HAULER_REG_', // Fixed v4 field name
      'hauler_other_id': 'Collection_Site_Reg_#',
      
      // Receiver/Processor fields - corrected spelling
      'receiver_name': 'Receiver_Name',
      'receiver_physical_address': 'Receiver_Address',
      'receiver_city': 'Receiver_City',
      'receiver_state': 'Receiver_State', // Fixed spelling in v4
      'receiver_zip': 'Receiver_Zip',
      'receiver_phone': 'Receiver_Phone', // Fixed spelling in v4
      
      // Weights and PTE - exact v4 spacing
      'hauler_gross_weight': 'Gross',
      'hauler_tare_weight': 'Tare',
      'hauler_net_weight': 'Net_Weight',
      'passenger_car_count': 'Passenger_Car',
      'truck_count': 'Truck',
      'oversized_count': 'Oversized',
      'generator_volume_weight': 'Passenger_Tire_Equivalents', // Fixed spacing
      'hauler_total_pte': 'Passenger_Tire_Equivalents',
      'receiver_total_pte': 'Passenger_Tire_Equivalents',
      
      // Signatures with exact v4 field names (note the spaces)
      'generator_signature': 'Generator_Signature _es_:signer:signature',
      'hauler_signature': 'Hauler_Signature _es_:signer:signature',
      'receiver_signature': 'Processor_Signature _es_:signer:signature',
      'generator_print_name': 'Generator_Print_Name',
      'hauler_print_name': 'Hauler_Print_Name',
      'receiver_print_name': 'Processor_Print_Name',
      'generator_date': 'Generator_Date',
      'hauler_date': 'Hauler_Date',
      'receiver_date': 'Processor_Date',
      // Include timestamps in the printed names since there are no separate time fields
      'generator_print_name_with_time': 'Generator_Print_Name',
      'hauler_print_name_with_time': 'Hauler_Print_Name', 
      'receiver_print_name_with_time': 'Processor_Print_Name'
    }
  }
};

/**
 * Get current template configuration
 */
export function getCurrentTemplateConfig(): PDFTemplateConfig {
  const config = TEMPLATE_CONFIGS[PDF_TEMPLATE_VERSION];
  if (!config) {
    throw new Error(`Unknown PDF template version: ${PDF_TEMPLATE_VERSION}`);
  }
  return config;
}

/**
 * Utility to write only fields that exist in the template
 * Logs warnings for unknown keys
 */
export function writeIfExists(
  templateKeys: string[], 
  key: string, 
  value: string,
  targetObject: Record<string, string>
): void {
  const config = getCurrentTemplateConfig();
  const templateField = config.fieldMapping[key];
  
  if (!templateField) {
    console.warn(`[PDF_TEMPLATE_V${config.version}] Unknown mapper key: ${key}`);
    return;
  }
  
  if (templateKeys.includes(templateField)) {
    targetObject[templateField] = value;
  } else {
    console.warn(`[PDF_TEMPLATE_V${config.version}] Field "${templateField}" not found in template for key "${key}"`);
  }
}