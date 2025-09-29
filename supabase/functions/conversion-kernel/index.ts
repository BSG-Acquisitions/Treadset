import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Michigan Tire Conversion Rules (authoritative)
const MICHIGAN_CONVERSIONS = {
  // Base PTE conversions
  'pte_to_pte': 1.0,
  'semi_to_pte': 5.0,
  'otr_to_pte': 15.0,
  'sidewalls_pass_to_pte': 0.25, // 4 sidewalls = 1 PTE
  'sidewalls_semi_to_pte': 1.25, // 4 sidewalls = 5 PTE (1.25 per sidewall)  
  'cubic_yards_to_pte': 10.0,
  
  // PRECEDENCE RULE: Michigan uses 89 PTE/ton (overrides semi->ton equality)
  'tons_to_pte': 89.0,
  'pte_to_tons': 1.0 / 89.0,
  
  // Derived conversions through PTE
  'cubic_yards_to_tons': 10.0 / 89.0, // 1 CY = 10 PTE = 10/89 tons
  'shredded_pte_to_cubic_yards': 0.25, // 40 shredded PTE = 10 CY
  'crumbed_pte_to_cubic_yards': 0.159, // 63 crumbed PTE = 10 CY
};

interface ConversionRequest {
  value: number;
  from_unit: string;
  to_unit: string;
  context?: {
    material_form?: string;
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
    timestamp: string;
  };
}

function getConversionFactor(fromUnit: string, toUnit: string): { factor: number; path: string[]; precedence?: string } {
  const key = `${fromUnit}_to_${toUnit}`;
  
  // Direct conversion exists
  if (MICHIGAN_CONVERSIONS[key as keyof typeof MICHIGAN_CONVERSIONS]) {
    return {
      factor: MICHIGAN_CONVERSIONS[key as keyof typeof MICHIGAN_CONVERSIONS],
      path: [`${fromUnit} -> ${toUnit}`],
      precedence: key.includes('tons') ? 'Michigan 89 PTE/ton rule' : undefined
    };
  }
  
  // Route through PTE for complex conversions
  if (fromUnit !== 'pte' && toUnit !== 'pte') {
    const fromToPte = MICHIGAN_CONVERSIONS[`${fromUnit}_to_pte` as keyof typeof MICHIGAN_CONVERSIONS];
    const pteToTarget = MICHIGAN_CONVERSIONS[`pte_to_${toUnit}` as keyof typeof MICHIGAN_CONVERSIONS];
    
    if (fromToPte && pteToTarget) {
      return {
        factor: fromToPte * pteToTarget,
        path: [`${fromUnit} -> pte`, `pte -> ${toUnit}`],
        precedence: toUnit === 'tons' ? 'Michigan 89 PTE/ton rule' : undefined
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
    const { value, from_unit, to_unit, context = {} }: ConversionRequest = await req.json();
    
    if (!value || !from_unit || !to_unit) {
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
    const { factor, path, precedence } = getConversionFactor(from_unit, to_unit);
    
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
        timestamp: new Date().toISOString()
      }
    };
    
    console.log('Conversion completed:', response);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('Conversion error:', error);
    
    return new Response(JSON.stringify({
      error: error?.message || 'Conversion error',
      timestamp: new Date().toISOString()
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);