import React, { createContext, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

interface DemoModeContextType {
  isDemoMode: boolean;
}

const DemoModeContext = createContext<DemoModeContextType>({
  isDemoMode: false,
});

export function useDemoMode() {
  return useContext(DemoModeContext);
}

interface DemoModeProviderProps {
  children: React.ReactNode;
}

export function DemoModeProvider({ children }: DemoModeProviderProps) {
  const location = useLocation();

  const isDemoMode = useMemo(() => {
    // Check if path starts with /demo
    const isOnDemoRoute = location.pathname.startsWith('/demo');
    
    // Check for ?demo=true query param
    const searchParams = new URLSearchParams(location.search);
    const hasDemoParam = searchParams.get('demo') === 'true';
    
    return isOnDemoRoute || hasDemoParam;
  }, [location.pathname, location.search]);

  return (
    <DemoModeContext.Provider value={{ isDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}
