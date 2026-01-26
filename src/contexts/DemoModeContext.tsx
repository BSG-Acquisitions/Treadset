import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
  const { hasRole } = useAuth();

  // Demo mode is now simply when the user has the 'viewer' role
  const isDemoMode = useMemo(() => {
    return hasRole('viewer');
  }, [hasRole]);

  return (
    <DemoModeContext.Provider value={{ isDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}
