/**
 * Michigan Tire Conversion Utilities
 * Implements Michigan's authoritative conversion rules for scrap tire reporting
 * 
 * BIDIRECTIONAL: All conversions work both ways for state compliance reporting
 */

import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// MICHIGAN CONVERSION CONSTANTS (authoritative)
// ============================================================================

export const MICHIGAN_CONVERSIONS = {
  // Base conversions to PTE
  PASSENGER_TIRE_TO_PTE: 1,
  SEMI_TIRE_TO_PTE: 5, 
  OTR_TIRE_TO_PTE: 15,
  SIDEWALLS_PASSENGER_TO_PTE: 0.25, // 4 sidewalls = 1 PTE
  SIDEWALLS_SEMI_TO_PTE: 1.25, // 4 sidewalls = 5 PTE
  
  // Michigan PRECEDENCE RULE: 1 ton = 89 PTE (overrides implied equality)
  TON_TO_PTE: 89,
  PTE_TO_TON: 1 / 89,
  
  // Volume conversions (raw tires)
  CUBIC_YARD_TO_PTE: 10,
  PTE_TO_CUBIC_YARD: 0.1,
  
  // Processed material (shredded/crumb) - legacy values for raw tire estimates
  SHREDDED_PTE_PER_CUBIC_YARD: 40, // 40 shredded PTE = 1 cubic yard
  CRUMBED_PTE_PER_CUBIC_YARD: 63, // 63 crumbed PTE = 1 cubic yard
  
  // Rubber mulch density conversion (user-provided: 1,000 lbs = 1.2 cubic yards)
  // 1 CY = 833.33 lbs = 0.41667 tons
  RUBBER_MULCH_TONS_PER_CUBIC_YARD: 0.41667,
  RUBBER_MULCH_LBS_PER_CUBIC_YARD: 833.33,
  RUBBER_MULCH_CY_PER_TON: 2.4, // Inverse: 1 ton = 2.4 CY
  
  // Standard weight conversions
  LBS_PER_TON: 2000,
  TONS_PER_LB: 0.0005,
} as const;

// ============================================================================
// MATERIAL DENSITIES (lbs per cubic yard)
// Different processed materials have different densities
// ============================================================================

export const MATERIAL_DENSITIES = {
  // Rubber mulch (user-provided: 1,000 lbs = 1.2 CY)
  rubber_mulch: 833.33,
  
  // Shred variations (estimated based on industry data)
  shred_1_inch: 550,    // 1" shred, more compact
  shred_2_inch: 500,    // 2" shred, less dense
  shred: 525,           // Generic shred average
  
  // TDA - Tire Derived Aggregate (larger pieces, more air)
  tda: 450,
  
  // Crumb rubber (fine particles, denser)
  crumb: 850,
  crumb_rubber: 850,
  
  // TDF - Tire Derived Fuel (similar to shred)
  tdf: 500,
  
  // Default to rubber mulch density
  default: 833.33,
} as const;

export type MaterialType = keyof typeof MATERIAL_DENSITIES;

// ============================================================================
// BIDIRECTIONAL CONVERSION FUNCTIONS
// ============================================================================

/**
 * Get material density (lbs/CY) by material type or product name
 */
export function getMaterialDensity(material?: string): number {
  if (!material) return MATERIAL_DENSITIES.default;
  
  const key = material.toLowerCase().replace(/[\s-]/g, '_') as MaterialType;
  return MATERIAL_DENSITIES[key] || MATERIAL_DENSITIES.default;
}

/**
 * Convert cubic yards to tons (material-aware)
 */
export function cubicYardsToTons(cubicYards: number, material?: string): number {
  const density = getMaterialDensity(material);
  const lbs = cubicYards * density;
  return lbs / MICHIGAN_CONVERSIONS.LBS_PER_TON;
}

/**
 * Convert tons to cubic yards (material-aware)
 */
export function tonsToCubicYards(tons: number, material?: string): number {
  const density = getMaterialDensity(material);
  const lbs = tons * MICHIGAN_CONVERSIONS.LBS_PER_TON;
  return lbs / density;
}

/**
 * Convert cubic yards to pounds (material-aware)
 */
export function cubicYardsToLbs(cubicYards: number, material?: string): number {
  const density = getMaterialDensity(material);
  return cubicYards * density;
}

/**
 * Convert pounds to cubic yards (material-aware)
 */
export function lbsToCubicYards(lbs: number, material?: string): number {
  const density = getMaterialDensity(material);
  return lbs / density;
}

/**
 * Convert pounds to tons
 */
export function lbsToTons(lbs: number): number {
  return lbs / MICHIGAN_CONVERSIONS.LBS_PER_TON;
}

/**
 * Convert tons to pounds
 */
export function tonsToLbs(tons: number): number {
  return tons * MICHIGAN_CONVERSIONS.LBS_PER_TON;
}

// ============================================================================
// UNIVERSAL CONVERSION FUNCTION
// Convert ANY unit to tons (for state compliance reporting)
// ============================================================================

export type ConvertibleUnit = 'pte' | 'tons' | 'lbs' | 'cubic_yards' | 'each';

/**
 * Convert any quantity to tons for state compliance reporting
 * @param quantity The amount to convert
 * @param fromUnit The unit of the quantity
 * @param material Optional material type for density-aware conversions
 */
export function convertToTons(
  quantity: number, 
  fromUnit: ConvertibleUnit, 
  material?: string
): number {
  switch (fromUnit) {
    case 'tons':
      return quantity;
    
    case 'lbs':
      return lbsToTons(quantity);
    
    case 'cubic_yards':
      return cubicYardsToTons(quantity, material);
    
    case 'pte':
      return quantity * MICHIGAN_CONVERSIONS.PTE_TO_TON;
    
    case 'each':
      // Assume "each" means individual tires = 1 PTE each
      return quantity * MICHIGAN_CONVERSIONS.PTE_TO_TON;
    
    default:
      console.warn(`Unknown unit "${fromUnit}", returning quantity as-is`);
      return quantity;
  }
}

/**
 * Convert tons to any target unit
 * @param tons The weight in tons
 * @param toUnit The target unit
 * @param material Optional material type for density-aware conversions
 */
export function convertFromTons(
  tons: number, 
  toUnit: ConvertibleUnit, 
  material?: string
): number {
  switch (toUnit) {
    case 'tons':
      return tons;
    
    case 'lbs':
      return tonsToLbs(tons);
    
    case 'cubic_yards':
      return tonsToCubicYards(tons, material);
    
    case 'pte':
      return tons * MICHIGAN_CONVERSIONS.TON_TO_PTE;
    
    case 'each':
      // Assume "each" means individual tires = 1 PTE each
      return tons * MICHIGAN_CONVERSIONS.TON_TO_PTE;
    
    default:
      console.warn(`Unknown unit "${toUnit}", returning tons as-is`);
      return tons;
  }
}

/**
 * Convert between any two units
 */
export function convertUnits(
  quantity: number,
  fromUnit: ConvertibleUnit,
  toUnit: ConvertibleUnit,
  material?: string
): number {
  // Convert to tons first, then to target unit
  const tons = convertToTons(quantity, fromUnit, material);
  return convertFromTons(tons, toUnit, material);
}

// ============================================================================
// PTE CALCULATION FUNCTIONS (unchanged from original)
// ============================================================================

export type TireUnit = 
  | 'pte' 
  | 'tons' 
  | 'semi' 
  | 'otr' 
  | 'cubic_yards'
  | 'sidewalls_pass'
  | 'sidewalls_semi'
  | 'shredded_pte'
  | 'crumbed_pte';

export type RoundingMode = 'report' | 'billing' | 'none';

interface ConversionResult {
  originalValue: number;
  originalUnit: TireUnit;
  convertedValue: number;
  convertedUnit: TireUnit;
  conversionFactor: number;
  precedenceRule?: string;
  calculationPath: string[];
}

/**
 * Convert between tire units using Michigan's rules
 */
export async function convertTireUnits(
  value: number,
  fromUnit: TireUnit,
  toUnit: TireUnit,
  rounding: RoundingMode = 'report'
): Promise<ConversionResult> {
  
  try {
    const { data, error } = await supabase.functions.invoke('conversion-kernel', {
      body: {
        value,
        from_unit: fromUnit,
        to_unit: toUnit,
        context: { rounding }
      }
    });

    if (error) throw error;

    return {
      originalValue: data.original_value,
      originalUnit: data.original_unit,
      convertedValue: data.converted_value,
      convertedUnit: data.converted_unit,
      conversionFactor: data.conversion_factor,
      precedenceRule: data.precedence_rule,
      calculationPath: data.audit.calculation_path
    };
    
  } catch (error) {
    console.error('Conversion failed:', error);
    throw new Error(`Failed to convert ${value} ${fromUnit} to ${toUnit}: ${(error as Error).message}`);
  }
}

/**
 * Calculate total PTE from tire counts (matches existing pickup data structure)
 */
export function calculateTotalPTE(tires: {
  pte_count?: number;
  otr_count?: number;
  tractor_count?: number; // Maps to semi tires in reporting
}): number {
  const pteCount = (tires.pte_count || 0) * MICHIGAN_CONVERSIONS.PASSENGER_TIRE_TO_PTE;
  const otrCount = (tires.otr_count || 0) * MICHIGAN_CONVERSIONS.OTR_TIRE_TO_PTE;
  const semiCount = (tires.tractor_count || 0) * MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE;
  
  return pteCount + otrCount + semiCount;
}

/**
 * Calculate total PTE from manifest tire counts (includes all tire types)
 *
 * Post-2026-05-01 model: semi_count is its own field for whole semi tires (5 PTE).
 * tractor_count and otr_count both fall in the OTR/Oversized class (15 PTE each).
 * Commercial 17.5/19.5 and 22.5 (sidewalls) are 5 PTE each.
 *
 * Historical note: pre-2026-05-01, tractor_count was used as semi (5 PTE) because
 * there was no semi_count field. Backfill of those rows is tracked separately.
 */
export function calculateManifestPTE(manifest: {
  pte_on_rim?: number;
  pte_off_rim?: number;
  commercial_17_5_19_5_off?: number;
  commercial_17_5_19_5_on?: number;
  commercial_22_5_off?: number;
  commercial_22_5_on?: number;
  otr_count?: number;
  tractor_count?: number;
  semi_count?: number;
}): number {
  // Passenger tires (1 PTE each)
  const passengerPTE = ((manifest.pte_on_rim || 0) + (manifest.pte_off_rim || 0)) * MICHIGAN_CONVERSIONS.PASSENGER_TIRE_TO_PTE;

  // Commercial sidewalls / commercial tires + whole semi (5 PTE each)
  const semiClassCount = (manifest.commercial_17_5_19_5_off || 0) +
                         (manifest.commercial_17_5_19_5_on || 0) +
                         (manifest.commercial_22_5_off || 0) +
                         (manifest.commercial_22_5_on || 0) +
                         (manifest.semi_count || 0);
  const semiClassPTE = semiClassCount * MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE;

  // OTR + Tractor — both 15 PTE (oversized class)
  const oversizedCount = (manifest.otr_count || 0) + (manifest.tractor_count || 0);
  const oversizedPTE = oversizedCount * MICHIGAN_CONVERSIONS.OTR_TIRE_TO_PTE;

  return passengerPTE + semiClassPTE + oversizedPTE;
}

/**
 * Convert PTE to tons using Michigan's 89 PTE/ton rule
 */
export function pteToTons(pte: number, rounding: RoundingMode = 'report'): number {
  const tons = pte * MICHIGAN_CONVERSIONS.PTE_TO_TON;
  
  if (rounding === 'report') {
    return Math.round(tons * 100) / 100; // 2 decimal places
  }
  
  return tons;
}

/**
 * Convert tons to PTE using Michigan's rule
 */
export function tonsToPTE(tons: number): number {
  return tons * MICHIGAN_CONVERSIONS.TON_TO_PTE;
}

/**
 * Convert PTE to cubic yards
 */
export function pteToCubicYards(pte: number, rounding: RoundingMode = 'report'): number {
  const cubicYards = pte * MICHIGAN_CONVERSIONS.PTE_TO_CUBIC_YARD;
  
  if (rounding === 'report') {
    return Math.round(cubicYards * 10) / 10; // 1 decimal place
  }
  
  return cubicYards;
}

// ============================================================================
// REPORTING HELPERS
// ============================================================================

/**
 * Calculate total tonnage from an array of inventory transactions
 * Used for state compliance reporting
 */
export function calculateTransactionTonnage(
  transactions: Array<{
    quantity: number;
    unit_of_measure: string;
    product_name?: string;
  }>
): number {
  let totalTons = 0;
  
  for (const t of transactions) {
    const unit = t.unit_of_measure as ConvertibleUnit;
    const material = t.product_name;
    totalTons += convertToTons(t.quantity, unit, material);
  }
  
  return Math.round(totalTons * 100) / 100;
}

/**
 * Validate Michigan conversion rules (for testing)
 */
export function validateMichiganRules(): {
  valid: boolean;
  tests: Array<{ description: string; expected: number; actual: number; passed: boolean }>;
} {
  const tests = [
    {
      description: '1 passenger tire = 1 PTE',
      expected: 1,
      actual: 1 * MICHIGAN_CONVERSIONS.PASSENGER_TIRE_TO_PTE,
      passed: false
    },
    {
      description: '1 semi tire = 5 PTE',
      expected: 5,
      actual: 1 * MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE,
      passed: false
    },
    {
      description: '1 OTR tire = 15 PTE',
      expected: 15,
      actual: 1 * MICHIGAN_CONVERSIONS.OTR_TIRE_TO_PTE,
      passed: false
    },
    {
      description: '89 PTE = 1 ton (Michigan rule)',
      expected: 1,
      actual: 89 * MICHIGAN_CONVERSIONS.PTE_TO_TON,
      passed: false
    },
    {
      description: '18 semi tires ≈ 1.01 tons (90 PTE / 89)',
      expected: 1.011,
      actual: Math.round((18 * 5 * MICHIGAN_CONVERSIONS.PTE_TO_TON) * 1000) / 1000,
      passed: false
    },
    {
      description: '1 CY rubber mulch = 0.417 tons',
      expected: 0.417,
      actual: Math.round(cubicYardsToTons(1, 'rubber_mulch') * 1000) / 1000,
      passed: false
    },
    {
      description: '1 ton rubber mulch = 2.4 CY',
      expected: 2.4,
      actual: Math.round(tonsToCubicYards(1, 'rubber_mulch') * 10) / 10,
      passed: false
    },
    {
      description: 'Bidirectional: CY→tons→CY = original',
      expected: 10,
      actual: Math.round(tonsToCubicYards(cubicYardsToTons(10, 'rubber_mulch'), 'rubber_mulch')),
      passed: false
    }
  ];
  
  tests.forEach(test => {
    test.passed = Math.abs(test.actual - test.expected) < 0.01;
  });
  
  return {
    valid: tests.every(test => test.passed),
    tests
  };
}
