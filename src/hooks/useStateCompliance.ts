import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StateComplianceConfig {
  state_code: string;
  state_name: string;
  pte_to_ton_ratio: number;
  requires_government_manifest: boolean;
  manifest_template_path: string | null;
  registration_label: string;
  report_format: string;
  field_mapping: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export function useStateComplianceConfigs() {
  return useQuery({
    queryKey: ['state-compliance-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('state_compliance_configs')
        .select('*')
        .order('state_name');
      if (error) throw error;
      return data as StateComplianceConfig[];
    },
  });
}

export function useStateComplianceConfig(stateCode: string | null) {
  return useQuery({
    queryKey: ['state-compliance-config', stateCode],
    queryFn: async () => {
      if (!stateCode) return null;
      const { data, error } = await supabase
        .from('state_compliance_configs')
        .select('*')
        .eq('state_code', stateCode)
        .maybeSingle();
      if (error) throw error;
      return data as StateComplianceConfig | null;
    },
    enabled: !!stateCode,
  });
}

export function useUpdateStateCompliance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<StateComplianceConfig> & { state_code: string }) => {
      const { data, error } = await supabase
        .from('state_compliance_configs')
        .upsert(config as any, { onConflict: 'state_code' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['state-compliance-configs'] });
      queryClient.invalidateQueries({ queryKey: ['state-compliance-config'] });
    },
  });
}

// All 50 US states for dropdowns
export const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];
