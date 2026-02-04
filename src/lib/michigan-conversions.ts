/**
 * Michigan Tire Conversion Utilities
 * Implements Michigan's authoritative conversion rules for scrap tire reporting
 */

import { supabase } from "@/integrations/supabase/client";

// Michigan Conversion Constants (authoritative)
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
  
  // Volume conversions
  CUBIC_YARD_TO_PTE: 10,
  PTE_TO_CUBIC_YARD: 0.1,
  
  // Processed material (shredded/crumb)
  SHREDDED_PTE_PER_CUBIC_YARD: 40, // 40 shredded PTE = 1 cubic yard
  CRUMBED_PTE_PER_CUBIC_YARD: 63, // 63 crumbed PTE = 1 cubic yard
  
  // Rubber mulch density conversion (user-provided: 1,000 lbs = 1.2 cubic yards)
  // 1 CY = 833.33 lbs = 0.41667 tons
  RUBBER_MULCH_TONS_PER_CUBIC_YARD: 0.41667,
  RUBBER_MULCH_LBS_PER_CUBIC_YARD: 833.33,
} as const;

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
    throw new Error(`Failed to convert ${value} ${fromUnit} to ${toUnit}: ${error.message}`);
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
}): number {
  // Passenger tires (1 PTE each)
  const passengerPTE = ((manifest.pte_on_rim || 0) + (manifest.pte_off_rim || 0)) * MICHIGAN_CONVERSIONS.PASSENGER_TIRE_TO_PTE;
  
  // Commercial/Semi tires (5 PTE each)
  const commercialCount = (manifest.commercial_17_5_19_5_off || 0) + 
                          (manifest.commercial_17_5_19_5_on || 0) + 
                          (manifest.commercial_22_5_off || 0) + 
                          (manifest.commercial_22_5_on || 0);
  const commercialPTE = commercialCount * MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE;
  
  // OTR and Tractor tires (15 PTE for OTR, 5 PTE for tractor which is semi-sized)
  const otrPTE = (manifest.otr_count || 0) * MICHIGAN_CONVERSIONS.OTR_TIRE_TO_PTE;
  const tractorPTE = (manifest.tractor_count || 0) * MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE;
  
  return passengerPTE + commercialPTE + otrPTE + tractorPTE;
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