// Pricing Engine Core Logic
import { supabase } from "@/integrations/supabase/client";
import type { 
  PriceForInput, 
  PriceForResult, 
  PriceMatrixRow, 
  SurchargeRule, 
  ClientPricingOverride, 
  LocationPricingOverride,
  PriceComponent,
  PriceSource
} from "./types";

// Simple JSON Logic evaluator for basic expressions
function evaluateJsonLogic(logic: any, data: any): boolean {
  if (!logic || typeof logic !== 'object') return false;
  
  if (logic.and) {
    return logic.and.every((condition: any) => evaluateJsonLogic(condition, data));
  }
  
  if (logic['==']) {
    const [left, right] = logic['=='];
    const leftVal = left.var ? data[left.var] : left;
    return leftVal === right;
  }
  
  if (logic.in) {
    const [item, array] = logic.in;
    const itemVal = item.var ? data[item.var] : item;
    return array.includes(itemVal);
  }
  
  return false;
}

export async function priceFor(input: PriceForInput): Promise<PriceForResult> {
  const {
    orgId,
    date,
    clientId,
    locationId,
    tireCategory,
    tireSizeInches,
    serviceMode,
    rim,
    quantity,
    distanceKm = 0,
    historicalClientMonthlyVolume = 0
  } = input;

  const components: PriceComponent[] = [];
  const warnings: string[] = [];
  let unitPrice = 0;
  let source: PriceSource = 'org_default';
  let confidence = 1.0;
  let rationale = '';
  let matchedRowId: string | undefined;

  try {
    // 1. Try location override first
    if (locationId) {
      const { data: locationOverrides } = await supabase
        .from('location_pricing_overrides')
        .select('*')
        .eq('organization_id', orgId)
        .eq('location_id', locationId)
        .eq('tire_category', tireCategory)
        .eq('service_mode', serviceMode)
        .eq('rim', rim)
        .lte('effective_from', date.toISOString())
        .or(`effective_to.is.null,effective_to.gte.${date.toISOString()}`)
        .order('effective_from', { ascending: false })
        .limit(1);

      if (locationOverrides && locationOverrides.length > 0) {
        const override = locationOverrides[0];
        unitPrice = Number(override.unit_price);
        source = 'location_override';
        rationale = `Location-specific pricing for ${tireCategory} ${serviceMode}`;
        matchedRowId = override.id;
        components.push({
          label: 'Location Override Price',
          type: 'base',
          value: unitPrice,
          source: 'location_override',
          ruleId: override.id
        });
      }
    }

    // 2. Try client override if no location override
    if (unitPrice === 0 && clientId) {
      const { data: clientOverrides } = await supabase
        .from('client_pricing_overrides')
        .select('*')
        .eq('organization_id', orgId)
        .eq('client_id', clientId)
        .eq('tire_category', tireCategory)
        .eq('service_mode', serviceMode)
        .eq('rim', rim)
        .lte('effective_from', date.toISOString())
        .or(`effective_to.is.null,effective_to.gte.${date.toISOString()}`)
        .order('effective_from', { ascending: false })
        .limit(1);

      if (clientOverrides && clientOverrides.length > 0) {
        const override = clientOverrides[0];
        unitPrice = Number(override.unit_price);
        source = 'client_override';
        rationale = `Client-specific pricing for ${tireCategory} ${serviceMode}`;
        matchedRowId = override.id;
        components.push({
          label: 'Client Override Price',
          type: 'base',
          value: unitPrice,
          source: 'client_override',
          ruleId: override.id
        });
      }
    }

    // 3. Try price matrix (admin manual or org default)
    if (unitPrice === 0) {
      const { data: priceMatrix } = await supabase
        .from('price_matrix')
        .select('*')
        .eq('organization_id', orgId)
        .eq('tire_category', tireCategory)
        .eq('service_mode', serviceMode)
        .eq('rim', rim)
        .lte('effective_from', date.toISOString())
        .or(`effective_to.is.null,effective_to.gte.${date.toISOString()}`)
        .order('priority', { ascending: true })
        .order('effective_from', { ascending: false })
        .limit(1);

      if (priceMatrix && priceMatrix.length > 0) {
        const matrix = priceMatrix[0];
        unitPrice = Number(matrix.unit_price);
        source = matrix.source;
        rationale = `Standard pricing from ${matrix.source} for ${tireCategory} ${serviceMode}`;
        matchedRowId = matrix.id;
        
        if (matrix.needs_confirmation) {
          warnings.push('This price needs admin confirmation');
          confidence = 0.7;
        }

        components.push({
          label: 'Base Price',
          type: 'base',
          value: unitPrice,
          source: matrix.source,
          ruleId: matrix.id
        });
      }
    }

    // 4. Smart suggestion if no exact match found
    if (unitPrice === 0) {
      // Try to find nearest size range or similar category
      const { data: similarPrices } = await supabase
        .from('price_matrix')
        .select('*')
        .eq('organization_id', orgId)
        .eq('tire_category', tireCategory)
        .eq('service_mode', serviceMode)
        .eq('rim', 'any') // Fall back to 'any' rim status
        .lte('effective_from', date.toISOString())
        .or(`effective_to.is.null,effective_to.gte.${date.toISOString()}`)
        .order('priority', { ascending: true })
        .limit(1);

      if (similarPrices && similarPrices.length > 0) {
        const similar = similarPrices[0];
        unitPrice = Number(similar.unit_price);
        source = 'smart_suggested';
        confidence = 0.6;
        rationale = `Suggested price based on similar ${tireCategory} category`;
        warnings.push('This is a suggested price - admin approval recommended');
        
        components.push({
          label: 'Suggested Base Price',
          type: 'base',
          value: unitPrice,
          source: 'smart_suggested',
          ruleId: similar.id
        });
      } else {
        // Fallback to organization defaults
        const { data: orgSettings } = await supabase
          .from('organizations')
          .select('default_pte_rate')
          .eq('id', orgId)
          .single();

        if (orgSettings && tireCategory === 'passenger') {
          unitPrice = Number(orgSettings.default_pte_rate || 25);
          source = 'org_default';
          confidence = 0.5;
          rationale = 'Fallback to organization default passenger rate';
          warnings.push('No specific pricing found - using organization default');
          
          components.push({
            label: 'Organization Default',
            type: 'base',
            value: unitPrice,
            source: 'org_default'
          });
        }
      }
    }

    // 5. Apply surcharges
    const { data: surchargeRules } = await supabase
      .from('surcharge_rules')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .lte('effective_from', date.toISOString())
      .or(`effective_to.is.null,effective_to.gte.${date.toISOString()}`)
      .order('priority', { ascending: true });

    if (surchargeRules) {
      const surchargeData = {
        service_mode: serviceMode,
        tire_category: tireCategory,
        rim: rim,
        distance_km: distanceKm,
        monthly_volume: historicalClientMonthlyVolume
      };

      for (const rule of surchargeRules) {
        if (rule.when_expr && evaluateJsonLogic(rule.when_expr, surchargeData)) {
          const surchargeValue = Number(rule.value);
          
          if (rule.value_type === 'percent') {
            const surchargeAmount = unitPrice * (surchargeValue / 100);
            unitPrice += surchargeAmount;
            components.push({
              label: rule.name,
              type: 'surcharge',
              value: surchargeAmount,
              source: 'admin_manual',
              ruleId: rule.id
            });
          } else {
            unitPrice += surchargeValue;
            components.push({
              label: rule.name,
              type: 'surcharge',
              value: surchargeValue,
              source: 'admin_manual',
              ruleId: rule.id
            });
          }
        }
      }
    }

    // 6. Apply volume discounts for high-volume clients
    if (historicalClientMonthlyVolume >= 500) {
      const discount = unitPrice * 0.06; // 6% discount
      unitPrice -= discount;
      confidence = Math.min(confidence + 0.1, 1.0);
      components.push({
        label: 'High Volume Discount (6%)',
        type: 'discount',
        value: -discount,
        source: 'smart_suggested'
      });
    } else if (historicalClientMonthlyVolume >= 250) {
      const discount = unitPrice * 0.03; // 3% discount
      unitPrice -= discount;
      confidence = Math.min(confidence + 0.05, 1.0);
      components.push({
        label: 'Volume Discount (3%)',
        type: 'discount',
        value: -discount,
        source: 'smart_suggested'
      });
    }

    // Ensure minimum price floor
    const minPrice = 1.00;
    if (unitPrice < minPrice) {
      warnings.push(`Price adjusted to minimum floor of $${minPrice.toFixed(2)}`);
      unitPrice = minPrice;
    }

    const totalPrice = unitPrice * quantity;

    return {
      unitPrice: Math.round(unitPrice * 100) / 100, // Round to 2 decimal places
      totalPrice: Math.round(totalPrice * 100) / 100,
      components,
      source,
      confidence,
      rationale,
      warnings,
      audit: {
        matchedRowId,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Error in priceFor:', error);
    
    // Fallback pricing
    const fallbackPrice = tireCategory === 'passenger' ? 2.50 : 10.00;
    
    return {
      unitPrice: fallbackPrice,
      totalPrice: fallbackPrice * quantity,
      components: [{
        label: 'Fallback Price',
        type: 'base',
        value: fallbackPrice,
        source: 'org_default'
      }],
      source: 'org_default',
      confidence: 0.1,
      rationale: 'Error occurred - using fallback pricing',
      warnings: ['Unable to calculate precise pricing - using fallback'],
      audit: {
        timestamp: new Date().toISOString()
      }
    };
  }
}