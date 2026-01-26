// Static demo data fixtures for marketing demo mode
import type {
  DemoClient,
  DemoPickup,
  DemoEmployee,
  DemoTrailer,
  DemoServiceZone,
  DemoDashboardMetrics,
  DemoAnalyticsData,
} from './types';

const DEMO_ORG_ID = 'demo-org-00000000-0000-0000-0000-000000000000';

// Helper to get dates relative to today
const today = new Date();
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const daysAgo = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return formatDate(d);
};

// ============================================
// DEMO CLIENTS - 10 Fictional Michigan Tire Shops
// ============================================
export const DEMO_CLIENTS: DemoClient[] = [
  {
    id: 'demo-client-001',
    company_name: 'Motor City Tire & Auto',
    contact_name: 'Marcus Johnson',
    email: 'marcus@motorcitytire.demo',
    phone: '(313) 555-0101',
    physical_address: '1234 Woodward Ave',
    physical_city: 'Detroit',
    physical_state: 'MI',
    physical_zip: '48201',
    is_active: true,
    lifetime_revenue: 45750,
    last_pickup_at: daysAgo(3),
    created_at: daysAgo(365),
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-client-002',
    company_name: 'Great Lakes Rubber Co',
    contact_name: 'Sarah Mitchell',
    email: 'sarah@greatlakesrubber.demo',
    phone: '(616) 555-0202',
    physical_address: '789 Monroe Center St',
    physical_city: 'Grand Rapids',
    physical_state: 'MI',
    physical_zip: '49503',
    is_active: true,
    lifetime_revenue: 38200,
    last_pickup_at: daysAgo(7),
    created_at: daysAgo(280),
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-client-003',
    company_name: 'Wolverine Tire Shop',
    contact_name: 'David Chen',
    email: 'david@wolverinetire.demo',
    phone: '(734) 555-0303',
    physical_address: '456 S State St',
    physical_city: 'Ann Arbor',
    physical_state: 'MI',
    physical_zip: '48104',
    is_active: true,
    lifetime_revenue: 52100,
    last_pickup_at: formatDate(today),
    created_at: daysAgo(420),
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-client-004',
    company_name: 'Mackinac Auto Service',
    contact_name: 'Emily Thompson',
    email: 'emily@mackinacauto.demo',
    phone: '(231) 555-0404',
    physical_address: '321 Front St',
    physical_city: 'Traverse City',
    physical_state: 'MI',
    physical_zip: '49684',
    is_active: true,
    lifetime_revenue: 28900,
    last_pickup_at: daysAgo(14),
    created_at: daysAgo(200),
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-client-005',
    company_name: 'Upper Peninsula Recycling',
    contact_name: 'Michael Anderson',
    email: 'michael@uprecycling.demo',
    phone: '(906) 555-0505',
    physical_address: '567 Washington St',
    physical_city: 'Marquette',
    physical_state: 'MI',
    physical_zip: '49855',
    is_active: true,
    lifetime_revenue: 19500,
    last_pickup_at: daysAgo(21),
    created_at: daysAgo(150),
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-client-006',
    company_name: 'Lansing Tire Center',
    contact_name: 'Jennifer Williams',
    email: 'jennifer@lansingtire.demo',
    phone: '(517) 555-0606',
    physical_address: '890 Michigan Ave',
    physical_city: 'Lansing',
    physical_state: 'MI',
    physical_zip: '48912',
    is_active: true,
    lifetime_revenue: 41300,
    last_pickup_at: daysAgo(5),
    created_at: daysAgo(300),
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-client-007',
    company_name: 'Flint Auto & Tire',
    contact_name: 'Robert Davis',
    email: 'robert@flintauto.demo',
    phone: '(810) 555-0707',
    physical_address: '234 Saginaw St',
    physical_city: 'Flint',
    physical_state: 'MI',
    physical_zip: '48502',
    is_active: true,
    lifetime_revenue: 33800,
    last_pickup_at: daysAgo(10),
    created_at: daysAgo(250),
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-client-008',
    company_name: 'Kalamazoo Wheel Works',
    contact_name: 'Amanda Garcia',
    email: 'amanda@kzoowheel.demo',
    phone: '(269) 555-0808',
    physical_address: '678 Portage Rd',
    physical_city: 'Kalamazoo',
    physical_state: 'MI',
    physical_zip: '49007',
    is_active: true,
    lifetime_revenue: 29400,
    last_pickup_at: daysAgo(8),
    created_at: daysAgo(180),
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-client-009',
    company_name: 'Saginaw Tire Depot',
    contact_name: 'Christopher Brown',
    email: 'chris@saginawtire.demo',
    phone: '(989) 555-0909',
    physical_address: '345 Court St',
    physical_city: 'Saginaw',
    physical_state: 'MI',
    physical_zip: '48602',
    is_active: true,
    lifetime_revenue: 26700,
    last_pickup_at: daysAgo(12),
    created_at: daysAgo(220),
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-client-010',
    company_name: 'Monroe Auto Care',
    contact_name: 'Lisa Martinez',
    email: 'lisa@monroeauto.demo',
    phone: '(734) 555-1010',
    physical_address: '123 E Front St',
    physical_city: 'Monroe',
    physical_state: 'MI',
    physical_zip: '48161',
    is_active: true,
    lifetime_revenue: 22100,
    last_pickup_at: daysAgo(6),
    created_at: daysAgo(160),
    organization_id: DEMO_ORG_ID,
  },
];

// ============================================
// DEMO PICKUPS - Today's Routes
// ============================================
export const DEMO_PICKUPS: DemoPickup[] = [
  {
    id: 'demo-pickup-001',
    client_id: 'demo-client-001',
    client: DEMO_CLIENTS[0],
    pickup_date: formatDate(today),
    status: 'completed',
    pte_count: 145,
    otr_count: 2,
    tractor_count: 0,
    preferred_window: '9:00 AM - 11:00 AM',
    notes: 'Loading dock in rear',
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-pickup-002',
    client_id: 'demo-client-002',
    client: DEMO_CLIENTS[1],
    pickup_date: formatDate(today),
    status: 'completed',
    pte_count: 89,
    otr_count: 0,
    tractor_count: 3,
    preferred_window: '10:30 AM - 12:30 PM',
    notes: null,
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-pickup-003',
    client_id: 'demo-client-003',
    client: DEMO_CLIENTS[2],
    pickup_date: formatDate(today),
    status: 'in_progress',
    pte_count: 112,
    otr_count: 1,
    tractor_count: 2,
    preferred_window: '12:00 PM - 2:00 PM',
    notes: 'Call 10 min before arrival',
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-pickup-004',
    client_id: 'demo-client-004',
    client: DEMO_CLIENTS[3],
    pickup_date: formatDate(today),
    status: 'scheduled',
    pte_count: 67,
    otr_count: 0,
    tractor_count: 0,
    preferred_window: '2:00 PM - 4:00 PM',
    notes: null,
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-pickup-005',
    client_id: 'demo-client-006',
    client: DEMO_CLIENTS[5],
    pickup_date: formatDate(today),
    status: 'scheduled',
    pte_count: 234,
    otr_count: 4,
    tractor_count: 1,
    preferred_window: '3:30 PM - 5:30 PM',
    notes: 'Large pickup - bring extra capacity',
    organization_id: DEMO_ORG_ID,
  },
];

// ============================================
// DEMO EMPLOYEES
// ============================================
export const DEMO_EMPLOYEES: DemoEmployee[] = [
  {
    id: 'demo-emp-001',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@demo.treadset.com',
    role: 'admin',
    created_at: daysAgo(500),
  },
  {
    id: 'demo-emp-002',
    first_name: 'Maria',
    last_name: 'Rodriguez',
    email: 'maria.rodriguez@demo.treadset.com',
    role: 'ops_manager',
    created_at: daysAgo(400),
  },
  {
    id: 'demo-emp-003',
    first_name: 'James',
    last_name: 'Wilson',
    email: 'james.wilson@demo.treadset.com',
    role: 'dispatcher',
    created_at: daysAgo(350),
  },
  {
    id: 'demo-emp-004',
    first_name: 'Michael',
    last_name: 'Carter',
    email: 'michael.carter@demo.treadset.com',
    role: 'driver',
    created_at: daysAgo(300),
  },
  {
    id: 'demo-emp-005',
    first_name: 'Anthony',
    last_name: 'Nguyen',
    email: 'anthony.nguyen@demo.treadset.com',
    role: 'driver',
    created_at: daysAgo(250),
  },
];

// ============================================
// DEMO TRAILERS
// ============================================
export const DEMO_TRAILERS: DemoTrailer[] = [
  {
    id: 'demo-trailer-001',
    trailer_number: 'TR-101',
    current_status: 'empty',
    current_location: 'Main Yard',
    capacity_ptes: 2000,
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-trailer-002',
    trailer_number: 'TR-102',
    current_status: 'full',
    current_location: 'Processing Facility',
    capacity_ptes: 2000,
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-trailer-003',
    trailer_number: 'TR-103',
    current_status: 'waiting_unload',
    current_location: 'Receiver Site',
    capacity_ptes: 2000,
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-trailer-004',
    trailer_number: 'TR-104',
    current_status: 'empty',
    current_location: 'Grand Rapids Hub',
    capacity_ptes: 2000,
    organization_id: DEMO_ORG_ID,
  },
];

// ============================================
// DEMO SERVICE ZONES
// ============================================
export const DEMO_SERVICE_ZONES: DemoServiceZone[] = [
  {
    id: 'demo-zone-001',
    name: 'Metro Detroit Zone',
    description: 'Wayne, Oakland, and Macomb counties',
    service_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    county_list: ['Wayne', 'Oakland', 'Macomb'],
    color: '#3B82F6',
    is_active: true,
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-zone-002',
    name: 'West Michigan Zone',
    description: 'Grand Rapids and surrounding areas',
    service_days: ['Monday', 'Wednesday', 'Friday'],
    county_list: ['Kent', 'Ottawa', 'Muskegon', 'Allegan'],
    color: '#10B981',
    is_active: true,
    organization_id: DEMO_ORG_ID,
  },
  {
    id: 'demo-zone-003',
    name: 'Northern Michigan Zone',
    description: 'Traverse City and Upper Peninsula',
    service_days: ['Tuesday', 'Thursday'],
    county_list: ['Grand Traverse', 'Leelanau', 'Marquette', 'Chippewa'],
    color: '#F59E0B',
    is_active: true,
    organization_id: DEMO_ORG_ID,
  },
];

// ============================================
// DEMO DASHBOARD METRICS
// ============================================
export const DEMO_DASHBOARD_METRICS: DemoDashboardMetrics = {
  todayPtes: 218,
  yesterdayPtes: 195,
  weekPtes: 1847,
  monthPtes: 11234,
  ytdPtes: 89456,
  activeClients: 83,
  monthlyRevenue: 24750,
  ytdRevenue: 287500,
  todayPickups: 5,
  weekPickups: 28,
  monthPickups: 124,
};

// ============================================
// DEMO ANALYTICS DATA
// ============================================
export const DEMO_ANALYTICS_DATA: DemoAnalyticsData = {
  monthlyData: [
    { month: 'Jan', revenue: 18500, pickups: 52, ptes: 9450 },
    { month: 'Feb', revenue: 21200, pickups: 58, ptes: 10200 },
    { month: 'Mar', revenue: 19800, pickups: 55, ptes: 9800 },
    { month: 'Apr', revenue: 23100, pickups: 62, ptes: 11100 },
    { month: 'May', revenue: 25400, pickups: 68, ptes: 12300 },
    { month: 'Jun', revenue: 24200, pickups: 65, ptes: 11800 },
    { month: 'Jul', revenue: 26800, pickups: 72, ptes: 13200 },
    { month: 'Aug', revenue: 28100, pickups: 75, ptes: 13800 },
    { month: 'Sep', revenue: 27500, pickups: 73, ptes: 13400 },
    { month: 'Oct', revenue: 29200, pickups: 78, ptes: 14200 },
    { month: 'Nov', revenue: 26900, pickups: 71, ptes: 13100 },
    { month: 'Dec', revenue: 24750, pickups: 65, ptes: 11234 },
  ],
  topClients: [
    { clientName: 'Wolverine Tire Shop', revenue: 52100, pickups: 145, ptes: 25400 },
    { clientName: 'Motor City Tire & Auto', revenue: 45750, pickups: 128, ptes: 22100 },
    { clientName: 'Lansing Tire Center', revenue: 41300, pickups: 115, ptes: 19800 },
    { clientName: 'Great Lakes Rubber Co', revenue: 38200, pickups: 106, ptes: 18400 },
    { clientName: 'Flint Auto & Tire', revenue: 33800, pickups: 94, ptes: 16200 },
  ],
};
