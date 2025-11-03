import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SandboxModeContextType {
  isSandboxMode: boolean;
  toggleSandboxMode: () => void;
  sandboxSchema: string;
}

const SandboxModeContext = createContext<SandboxModeContextType | undefined>(undefined);

export const SandboxModeProvider = ({ children }: { children: ReactNode }) => {
  const [isSandboxMode, setIsSandboxMode] = useState(() => {
    return localStorage.getItem('sandboxMode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sandboxMode', isSandboxMode.toString());
  }, [isSandboxMode]);

  const toggleSandboxMode = () => {
    setIsSandboxMode(prev => !prev);
  };

  const sandboxSchema = isSandboxMode ? 'sandbox_' : '';

  return (
    <SandboxModeContext.Provider value={{ isSandboxMode, toggleSandboxMode, sandboxSchema }}>
      {children}
    </SandboxModeContext.Provider>
  );
};

export const useSandboxMode = () => {
  const context = useContext(SandboxModeContext);
  if (context === undefined) {
    throw new Error('useSandboxMode must be used within a SandboxModeProvider');
  }
  return context;
};
