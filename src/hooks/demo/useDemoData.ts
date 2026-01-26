// Demo-aware data hooks
// These hooks return static demo data when in demo mode

import { useDemoMode } from '@/contexts/DemoModeContext';
import {
  DEMO_CLIENTS,
  DEMO_PICKUPS,
  DEMO_EMPLOYEES,
  DEMO_TRAILERS,
  DEMO_SERVICE_ZONES,
  DEMO_DASHBOARD_METRICS,
  DEMO_ANALYTICS_DATA,
} from '@/lib/demo';

export function useDemoClients() {
  const { isDemoMode } = useDemoMode();
  
  return {
    data: isDemoMode ? DEMO_CLIENTS : [],
    isLoading: false,
    error: null,
    isDemoMode,
  };
}

export function useDemoPickups() {
  const { isDemoMode } = useDemoMode();
  
  return {
    data: isDemoMode ? DEMO_PICKUPS : [],
    isLoading: false,
    error: null,
    isDemoMode,
  };
}

export function useDemoEmployees() {
  const { isDemoMode } = useDemoMode();
  
  return {
    data: isDemoMode ? DEMO_EMPLOYEES : [],
    isLoading: false,
    error: null,
    isDemoMode,
  };
}

export function useDemoTrailers() {
  const { isDemoMode } = useDemoMode();
  
  return {
    data: isDemoMode ? DEMO_TRAILERS : [],
    isLoading: false,
    error: null,
    isDemoMode,
  };
}

export function useDemoServiceZones() {
  const { isDemoMode } = useDemoMode();
  
  return {
    data: isDemoMode ? DEMO_SERVICE_ZONES : [],
    isLoading: false,
    error: null,
    isDemoMode,
  };
}

export function useDemoDashboard() {
  const { isDemoMode } = useDemoMode();
  
  return {
    data: isDemoMode ? DEMO_DASHBOARD_METRICS : null,
    isLoading: false,
    error: null,
    isDemoMode,
  };
}

export function useDemoAnalytics() {
  const { isDemoMode } = useDemoMode();
  
  return {
    data: isDemoMode ? DEMO_ANALYTICS_DATA : null,
    isLoading: false,
    error: null,
    isDemoMode,
  };
}
