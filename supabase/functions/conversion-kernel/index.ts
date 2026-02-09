import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// MATERIAL DENSITIES (lbs per cubic yard)
// ============================================================================
const MATERIAL_DENSITIES: Record<string, number> = {
  rubber_mulch: 833.33,
  shred_1_inch: 550,
  shred_2_inch: 500,
  shred: 525,
  tda: 450,
  crumb: 850,
  crumb_rubber: 850,
  tdf: 500,
  default: 833.33,
};

// ============================================================================
// Michigan Tire Conversion Rules (authoritative)
// ============================================================================
const MICHIGAN_CONVERSIONS: Record<string, number> = {
  // Base PTE conversions
  'pte_to_pte': 1.0,
  'semi_to_pte': 5.0,
  'otr_to_pte': 15.0,
  'sidewalls_pass_to_pte': 0.25,
  'sidewalls_semi_to_pte': 1.25,
  'cubic_yards_to_pte': 10.0,
  
  // PRECEDENCE RULE: Michigan uses 89 PTE/ton
  'tons_to_pte': 89.0,
  'pte_to_tons': 1.0 / 89.0,
  
  // Derived conversions through PTE
  'cubic_yards_to_tons': 10.0 / 89.0,
  'shredded_pte_to_cubic_yards': 0.25,
  'crumbed_pte_to_cubic_yards': 0.159,
  
  // ========================================
  // BIDIRECTIONAL CONVERSIONS (NEW)
  // ========================================
  
  // Weight conversions
  'lbs_to_tons': 1.0 / 2000.0,
  'tons_to_lbs': 2000.0,
  
  // Rubber mulch: 1,000 lbs = 1.2 CY → 1 CY = 833.33 lbs = 0.41667 tons
  'cubic_yards_to_lbs': 833.33,         // Default density (rubber mulch)
  'lbs_to_cubic_yards': 1.0 / 833.33,   // Inverse
  'tons_to_cubic_yards': 2.4,           // 1 ton = 2.4 CY rubber mulch
  
  // PTE to other units
  'pte_to_cubic_yards': 0.1,
  'pte_to_lbs': 2000.0 / 89.0,          // 1 PTE = ~22.47 lbs
};

interface ConversionRequest {
  value: number;
  from_unit: string;
  to_unit: string;
  state_code?: string; // Optional: use state-specific PTE ratio
  context?: {
    material_form?: string;
    material_type?: string;
    basis?: 'any' | 'semi';
    rounding?: 'report' | 'billing' | 'none';
  };
}

interface ConversionResponse {
  original_value: number;
  original_unit: string;
  converted_value: number;
  converted_unit: string;
  conversion_factor: number;
  precedence_rule?: string;
  audit: {
    calculation_path: string[];
    rounding_applied: string;
    material_density_used?: number;
    timestamp: string;
  };
}

function getMaterialDensity(materialType?: string): number {
  if (!materialType) return MATERIAL_DENSITIES.default;
  const key = materialType.toLowerCase().replace(/[\s-]/g, '_');
  return MATERIAL_DENSITIES[key] || MATERIAL_DENSITIES.default;
}

function getConversionFactor(
  fromUnit: string, 
  toUnit: string,
  materialType?: string
): { factor: number; path: string[]; precedence?: string; densityUsed?: number } {
  const key = `${fromUnit}_to_${toUnit}`;
  
  // Direct conversion exists
  if (MICHIGAN_CONVERSIONS[key]) {
    // For material-aware conversions, adjust by density if needed
    if ((fromUnit === 'cubic_yards' || toUnit === 'cubic_yards') && 
        (fromUnit === 'lbs' || toUnit === 'lbs' || fromUnit === 'tons' || toUnit === 'tons')) {
      const density = getMaterialDensity(materialType);
      
      if (key === 'cubic_yards_to_lbs') {
        return {
          factor: density,
          path: [`${fromUnit} -> ${toUnit} (density: ${density} lbs/CY)`],
          densityUsed: density
        };
      }
      if (key === 'lbs_to_cubic_yards') {
        return {
          factor: 1.0 / density,
          path: [`${fromUnit} -> ${toUnit} (density: ${density} lbs/CY)`],
          densityUsed: density
        };
      }
      if (key === 'cubic_yards_to_tons') {
        const factor = density / 2000.0;
        return {
          factor,
          path: [`${fromUnit} -> ${toUnit} (density: ${density} lbs/CY = ${(factor * 1000).toFixed(2)} tons/1000CY)`],
          densityUsed: density
        };
      }
      if (key === 'tons_to_cubic_yards') {
        const factor = 2000.0 / density;
        return {
          factor,
          path: [`${fromUnit} -> ${toUnit} (density: ${density} lbs/CY)`],
          densityUsed: density
        };
      }
    }
    
    return {
      factor: MICHIGAN_CONVERSIONS[key],
      path: [`${fromUnit} -> ${toUnit}`],
      precedence: key.includes('tons') && key.includes('pte') ? 'Michigan 89 PTE/ton rule' : undefined
    };
  }
  
  // Route through intermediate units for complex conversions
  
  // Try routing through PTE
  if (fromUnit !== 'pte' && toUnit !== 'pte') {
    const fromToPte = MICHIGAN_CONVERSIONS[`${fromUnit}_to_pte`];
    const pteToTarget = MICHIGAN_CONVERSIONS[`pte_to_${toUnit}`];
    
    if (fromToPte && pteToTarget) {
      return {
        factor: fromToPte * pteToTarget,
        path: [`${fromUnit} -> pte`, `pte -> ${toUnit}`],
        precedence: toUnit === 'tons' ? 'Michigan 89 PTE/ton rule' : undefined
      };
    }
  }
  
  // Try routing through tons
  if (fromUnit !== 'tons' && toUnit !== 'tons') {
    const fromToTons = MICHIGAN_CONVERSIONS[`${fromUnit}_to_tons`];
    const tonsToTarget = MICHIGAN_CONVERSIONS[`tons_to_${toUnit}`];
    
    if (fromToTons && tonsToTarget) {
      return {
        factor: fromToTons * tonsToTarget,
        path: [`${fromUnit} -> tons`, `tons -> ${toUnit}`]
      };
    }
  }
  
  // Try routing through lbs
  if (fromUnit !== 'lbs' && toUnit !== 'lbs') {
    const density = getMaterialDensity(materialType);
    
    // cubic_yards -> lbs -> tons
    if (fromUnit === 'cubic_yards' && toUnit === 'tons') {
      const factor = density / 2000.0;
      return {
        factor,
        path: [`${fromUnit} -> lbs (×${density})`, `lbs -> ${toUnit} (÷2000)`],
        densityUsed: density
      };
    }
    
    // tons -> lbs -> cubic_yards
    if (fromUnit === 'tons' && toUnit === 'cubic_yards') {
      const factor = 2000.0 / density;
      return {
        factor,
        path: [`${fromUnit} -> lbs (×2000)`, `lbs -> ${toUnit} (÷${density})`],
        densityUsed: density
      };
    }
  }
  
  throw new Error(`No conversion path found from ${fromUnit} to ${toUnit}`);
}

function applyRounding(value: number, unit: string, roundingType: string): number {
  if (roundingType === 'none') return value;
  
  switch (roundingType) {
    case 'report':
      if (unit === 'pte') return Math.round(value);
      if (unit === 'tons') return Math.round(value * 100) / 100; // 2 decimals
      if (unit === 'cubic_yards') return Math.round(value * 10) / 10; // 1 decimal
      if (unit === 'lbs') return Math.round(value); // Whole pounds
      if (unit.includes('dollars')) return Math.round(value * 100) / 100; // 2 decimals
      return Math.round(value);
      
    case 'billing':
      return Math.round(value * 100) / 100; // Always 2 decimals for billing
      
    default:
      return value;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { value, from_unit, to_unit, state_code, context = {} }: ConversionRequest = await req.json();
    
    // If state_code provided, look up state-specific PTE ratio and override
    if (state_code && state_code !== 'MI') {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { data: stateConfig } = await supabase
          .from('state_compliance_configs')
          .select('pte_to_ton_ratio')
          .eq('state_code', state_code)
          .maybeSingle();
        
        if (stateConfig?.pte_to_ton_ratio && stateConfig.pte_to_ton_ratio !== 89) {
          const ratio = Number(stateConfig.pte_to_ton_ratio);
          MICHIGAN_CONVERSIONS['tons_to_pte'] = ratio;
          MICHIGAN_CONVERSIONS['pte_to_tons'] = 1.0 / ratio;
          MICHIGAN_CONVERSIONS['cubic_yards_to_tons'] = 10.0 / ratio;
          MICHIGAN_CONVERSIONS['pte_to_lbs'] = 2000.0 / ratio;
          console.log(`Using ${state_code} PTE ratio: ${ratio}`);
        }
      } catch (e) {
        console.warn(`Failed to fetch state config for ${state_code}, using MI defaults:`, e);
      }
    }
    
    if (value === undefined || value === null || !from_unit || !to_unit) {
      throw new Error('Missing required parameters: value, from_unit, to_unit');
    }
    
    if (value < 0) {
      throw new Error('Value cannot be negative');
    }
    
    // Same unit - no conversion needed
    if (from_unit === to_unit) {
      return new Response(JSON.stringify({
        original_value: value,
        original_unit: from_unit,
        converted_value: value,
        converted_unit: to_unit,
        conversion_factor: 1.0,
        audit: {
          calculation_path: ['No conversion needed'],
          rounding_applied: 'none',
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Get conversion factor and path
    const materialType = context.material_type || context.material_form;
    const { factor, path, precedence, densityUsed } = getConversionFactor(from_unit, to_unit, materialType);
    
    // Convert
    let convertedValue = value * factor;
    
    // Apply rounding
    const roundingType = context.rounding || 'report';
    const finalValue = applyRounding(convertedValue, to_unit, roundingType);
    
    const response: ConversionResponse = {
      original_value: value,
      original_unit: from_unit,
      converted_value: finalValue,
      converted_unit: to_unit,
      conversion_factor: factor,
      precedence_rule: precedence,
      audit: {
        calculation_path: path,
        rounding_applied: roundingType,
        material_density_used: densityUsed,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('Conversion completed:', response);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: unknown) {
    console.error('Conversion error:', error);
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Conversion error',
      timestamp: new Date().toISOString()
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);
