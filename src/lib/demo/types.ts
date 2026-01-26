// Demo mode type definitions

export interface DemoClient {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  physical_address: string;
  physical_city: string;
  physical_state: string;
  physical_zip: string;
  is_active: boolean;
  lifetime_revenue: number;
  last_pickup_at: string | null;
  created_at: string;
  organization_id: string;
}

export interface DemoPickup {
  id: string;
  client_id: string;
  client: DemoClient;
  pickup_date: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  pte_count: number;
  otr_count: number;
  tractor_count: number;
  preferred_window: string;
  notes: string | null;
  organization_id: string;
}

export interface DemoEmployee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'ops_manager' | 'dispatcher' | 'driver';
  created_at: string;
}

export interface DemoTrailer {
  id: string;
  trailer_number: string;
  current_status: 'empty' | 'full' | 'waiting_unload' | 'in_transit';
  current_location: string;
  capacity_ptes: number;
  organization_id: string;
}

export interface DemoServiceZone {
  id: string;
  name: string;
  description: string;
  service_days: string[];
  county_list: string[];
  color: string;
  is_active: boolean;
  organization_id: string;
}

export interface DemoDashboardMetrics {
  todayPtes: number;
  yesterdayPtes: number;
  weekPtes: number;
  monthPtes: number;
  ytdPtes: number;
  activeClients: number;
  monthlyRevenue: number;
  ytdRevenue: number;
  todayPickups: number;
  weekPickups: number;
  monthPickups: number;
}

export interface DemoAnalyticsData {
  monthlyData: {
    month: string;
    revenue: number;
    pickups: number;
    ptes: number;
  }[];
  topClients: {
    clientName: string;
    revenue: number;
    pickups: number;
    ptes: number;
  }[];
}
