/**
 * Central Data Source Abstraction
 * Routes between real Supabase data and mock/fixture data based on USE_REAL_DATA flag
 */

import { supabase } from "@/integrations/supabase/client";

// Runtime configuration
const USE_REAL_DATA = (typeof window !== 'undefined' 
  ? (window as any).__USE_REAL_DATA__ 
  : process.env.USE_REAL_DATA) === 'true';

// Build-time validation - fail if trying to use real data with mocks loaded
if (USE_REAL_DATA && typeof window === 'undefined') {
  // Server-side check for mock imports
  try {
    const mockModules = [
      '/__mocks__',
      '/fixtures',
      'Mock',
      'Fake'
    ];
    
    // This will be expanded by build tools to detect mock imports
    const importedModules = (global as any).__IMPORTED_MODULES__ || [];
    const mockImports = importedModules.filter((mod: string) => 
      mockModules.some(pattern => mod.includes(pattern))
    );
    
    if (mockImports.length > 0) {
      throw new Error(`BUILD ERROR: USE_REAL_DATA=true but mock modules detected: ${mockImports.join(', ')}`);
    }
  } catch (e) {
    // Log but don't fail build in development
    if (process.env.NODE_ENV === 'production') {
      throw e;
    }
    console.warn('[DATA_SOURCE]', e);
  }
}

// Runtime boot check - log error if mocks are loaded when they shouldn't be
if (USE_REAL_DATA && typeof window !== 'undefined') {
  const globalChecks = [
    (window as any).__MOCK_DATA__,
    (window as any).__FIXTURES__,
    (window as any).__TEST_MODE__
  ];
  
  if (globalChecks.some(check => check)) {
    const error = 'RUNTIME ERROR: USE_REAL_DATA=true but mock data detected in window globals';
    console.error('[DATA_SOURCE]', error);
    
    // Throw in staging to catch issues early
    if (window.location.hostname.includes('staging') || window.location.hostname.includes('preview')) {
      throw new Error(error);
    }
  }
}

/**
 * Data source interface definitions
 */
export interface Client {
  id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  mailing_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
}

export interface Location {
  id: string;
  name?: string;
  address: string;
  client_id: string;
}

export interface Hauler {
  id: string;
  hauler_name: string;
  hauler_mailing_address?: string;
  hauler_city?: string;
  hauler_state?: string;
  hauler_zip?: string;
  hauler_phone?: string;
  hauler_mi_reg?: string;
}

export interface Receiver {
  id: string;
  receiver_name: string;
  receiver_mailing_address?: string;
  receiver_city?: string;
  receiver_state?: string;
  receiver_zip?: string;
  receiver_phone?: string;
}

export interface Manifest {
  id: string;
  manifest_number: string;
  client_id: string;
  location_id?: string;
  pickup_id?: string;
  hauler_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
  // Add other manifest fields as needed
}

/**
 * Mock data fallbacks (only used when USE_REAL_DATA=false)
 */
const MOCK_CLIENTS: Client[] = [
  {
    id: 'mock-client-1',
    company_name: 'Test Generator Co',
    contact_name: 'John Doe',
    email: 'john@testgen.com',
    phone: '555-0123',
    mailing_address: '123 Test St',
    city: 'Test City',
    state: 'MI',
    zip: '48001',
    county: 'Test County'
  }
];

const MOCK_HAULERS: Hauler[] = [
  {
    id: 'mock-hauler-1',
    hauler_name: 'Test Hauler LLC',
    hauler_mailing_address: '456 Hauler Ave',
    hauler_city: 'Hauler City',
    hauler_state: 'MI',
    hauler_zip: '48002',
    hauler_phone: '555-0456',
    hauler_mi_reg: 'MI123456'
  }
];

const MOCK_RECEIVERS: Receiver[] = [
  {
    id: 'mock-receiver-1',
    receiver_name: 'Test Processor Inc',
    receiver_mailing_address: '789 Processor Blvd',
    receiver_city: 'Processor City',
    receiver_state: 'MI',
    receiver_zip: '48003',
    receiver_phone: '555-0789'
  }
];

/**
 * Central data access functions
 */
export const dataSource = {
  /**
   * Fetch clients with search filtering
   */
  async getClients(search?: string): Promise<Client[]> {
    if (!USE_REAL_DATA) {
      console.log('[DATA_SOURCE] Using mock clients');
      return MOCK_CLIENTS.filter(c => 
        !search || c.company_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .ilike('company_name', `%${search || ''}%`)
      .eq('is_active', true)
      .limit(50);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get client by ID
   */
  async getClient(id: string): Promise<Client | null> {
    if (!USE_REAL_DATA) {
      return MOCK_CLIENTS.find(c => c.id === id) || null;
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch haulers with search filtering
   */
  async getHaulers(search?: string): Promise<Hauler[]> {
    if (!USE_REAL_DATA) {
      console.log('[DATA_SOURCE] Using mock haulers');
      return MOCK_HAULERS.filter(h => 
        !search || h.hauler_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    const { data, error } = await supabase
      .from('haulers')
      .select('*')
      .ilike('hauler_name', `%${search || ''}%`)
      .eq('is_active', true)
      .limit(50);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get hauler by ID
   */
  async getHauler(id: string): Promise<Hauler | null> {
    if (!USE_REAL_DATA) {
      return MOCK_HAULERS.find(h => h.id === id) || null;
    }

    const { data, error } = await supabase
      .from('haulers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Fetch receivers with search filtering
   */
  async getReceivers(search?: string): Promise<Receiver[]> {
    if (!USE_REAL_DATA) {
      console.log('[DATA_SOURCE] Using mock receivers');
      return MOCK_RECEIVERS.filter(r => 
        !search || r.receiver_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    const { data, error } = await supabase
      .from('receivers')
      .select('*')
      .ilike('receiver_name', `%${search || ''}%`)
      .eq('is_active', true)
      .limit(50);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get receiver by ID
   */
  async getReceiver(id: string): Promise<Receiver | null> {
    if (!USE_REAL_DATA) {
      return MOCK_RECEIVERS.find(r => r.id === id) || null;
    }

    const { data, error } = await supabase
      .from('receivers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get manifest with related data
   */
  async getManifestWithRelations(id: string): Promise<any> {
    if (!USE_REAL_DATA) {
      console.log('[DATA_SOURCE] Using mock manifest data');
      return {
        id,
        manifest_number: `MOCK-${id}`,
        client: MOCK_CLIENTS[0],
        hauler: MOCK_HAULERS[0],
        created_at: new Date().toISOString()
      };
    }

    const { data, error } = await supabase
      .from('manifests')
      .select(`
        *,
        client:clients(*),
        location:locations(*),
        hauler:haulers(*),
        pickup:pickups!manifests_pickup_id_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }
};

/**
 * Get current data source configuration
 */
export function getDataSourceConfig() {
  return {
    useRealData: USE_REAL_DATA,
    isClientSide: typeof window !== 'undefined',
    buildTime: new Date().toISOString()
  };
}

/**
 * Log data source configuration on module load
 */
console.log('[DATA_SOURCE] Configuration:', getDataSourceConfig());