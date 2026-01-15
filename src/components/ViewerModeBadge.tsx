import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Shows a "Demo Mode" badge when the current user has the viewer role.
 * Place this in the header/top navigation to remind investors they're in read-only mode.
 */
export function ViewerModeBadge() {
  const { hasRole } = useAuth();
  
  if (!hasRole('viewer')) {
    return null;
  }

  return (
    <Badge 
      variant="outline" 
      className="bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800 gap-1 flex-shrink-0"
    >
      <Eye className="h-3 w-3" />
      <span className="hidden sm:inline">Demo Mode</span>
    </Badge>
  );
}
