// Pricing Engine Types

export type TireCategory = 'passenger' | 'commercial_17_5_19_5' | 'commercial_22_5' | 'otr' | 'other';
export type ServiceMode = 'pickup' | 'dropoff';
export type RimStatus = 'off' | 'on' | 'any';
export type PriceSource = 'org_default' | 'admin_manual' | 'smart_suggested' | 'client_override' | 'location_override';
export type SurchargeType = 'rim_on' | 'after_hours' | 'fuel' | 'distance_band';
export type ValueType = 'flat' | 'percent';

export interface PriceMatrixRow {
  id: string;
  organization_id: string;
  tire_category: TireCategory;
  size_min_inches?: number;
  size_max_inches?: number;
  service_mode: ServiceMode;
  rim: RimStatus;
  unit_price: number;
  priority: number;
  effective_from: string;
  effective_to?: string;
  source: PriceSource;
  notes?: string;
  needs_confirmation: boolean;
  created_at: string;
  updated_at: string;
}

export interface SurchargeRule {
  id: string;
  organization_id: string;
  name: string;
  type: SurchargeType;
  value_type: ValueType;
  value: number;
  when_expr?: any; // JSON logic expression
  effective_from: string;
  effective_to?: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientPricingOverride {
  id: string;
  organization_id: string;
  client_id: string;
  tire_category: TireCategory;
  size_min_inches?: number;
  size_max_inches?: number;
  service_mode: ServiceMode;
  rim: RimStatus;
  unit_price: number;
  effective_from: string;
  effective_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LocationPricingOverride {
  id: string;
  organization_id: string;
  location_id: string;
  tire_category: TireCategory;
  size_min_inches?: number;
  size_max_inches?: number;
  service_mode: ServiceMode;
  rim: RimStatus;
  unit_price: number;
  effective_from: string;
  effective_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PriceForInput {
  orgId: string;
  date: Date;
  clientId?: string;
  locationId?: string;
  tireCategory: TireCategory;
  tireSizeInches?: number;
  serviceMode: ServiceMode;
  rim: RimStatus;
  quantity: number;
  distanceKm?: number;
  historicalClientMonthlyVolume?: number;
}

export interface PriceComponent {
  label: string;
  type: 'base' | 'surcharge' | 'discount';
  value: number;
  source: PriceSource;
  ruleId?: string;
}

export interface PriceForResult {
  unitPrice: number;
  totalPrice: number;
  components: PriceComponent[];
  source: PriceSource;
  confidence: number; // 0-1 scale
  rationale: string;
  warnings: string[];
  audit: {
    matchedRowId?: string;
    versionId?: string;
    timestamp: string;
  };
}