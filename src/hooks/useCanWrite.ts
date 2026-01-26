import { useAuth } from '@/contexts/AuthContext';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

/**
 * Hook to check if the current user has write permissions.
 * Viewers (investor/demo accounts) are read-only and cannot make changes.
 * Demo mode also blocks all writes.
 */
export function useCanWrite(): boolean {
  const { hasRole } = useAuth();
  const { isDemoMode } = useDemoMode();
  
  // Demo mode and viewers cannot write - they have read-only access
  if (isDemoMode) return false;
  return !hasRole('viewer');
}

/**
 * Hook that returns a function to guard write operations.
 * Shows a toast when a viewer or demo user tries to perform a write action.
 */
export function useWriteGuard() {
  const canWrite = useCanWrite();
  const { isDemoMode } = useDemoMode();
  const { toast } = useToast();

  const guardWrite = useCallback(<T>(fn: () => T): T | undefined => {
    if (!canWrite) {
      toast({
        title: isDemoMode ? "Demo Mode" : "Demo Mode",
        description: isDemoMode 
          ? "This is a demo with sample data. Actions are disabled."
          : "This is a read-only demo account. Changes are disabled.",
        variant: "default",
      });
      return undefined;
    }
    return fn();
  }, [canWrite, isDemoMode, toast]);

  return { canWrite, guardWrite };
}
