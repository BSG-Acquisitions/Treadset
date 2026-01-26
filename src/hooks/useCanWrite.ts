import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

/**
 * Hook to check if the current user has write permissions.
 * Viewers (investor/demo accounts) are read-only and cannot make changes.
 */
export function useCanWrite(): boolean {
  const { hasRole } = useAuth();
  
  // Viewers cannot write - they have read-only access
  return !hasRole('viewer');
}

/**
 * Hook that returns a function to guard write operations.
 * Shows a toast when a viewer tries to perform a write action.
 */
export function useWriteGuard() {
  const canWrite = useCanWrite();
  const { toast } = useToast();

  const guardWrite = useCallback(<T>(fn: () => T): T | undefined => {
    if (!canWrite) {
      toast({
        title: "Demo Mode",
        description: "This is a read-only demo account. Changes are disabled.",
        variant: "default",
      });
      return undefined;
    }
    return fn();
  }, [canWrite, toast]);

  return { canWrite, guardWrite };
}
