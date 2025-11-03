import { useSandboxMode } from '@/contexts/SandboxModeContext';
import { Badge } from '@/components/ui/badge';
import { TestTube } from 'lucide-react';

export const SandboxModeBanner = () => {
  const { isSandboxMode } = useSandboxMode();

  if (!isSandboxMode) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-pulse">
      <Badge 
        variant="outline" 
        className="h-10 px-4 text-base font-bold border-2 border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400 shadow-lg"
      >
        <TestTube className="h-5 w-5 mr-2" />
        TEST MODE
      </Badge>
    </div>
  );
};
