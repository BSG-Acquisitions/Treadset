import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export function DemoModeBanner() {
  return (
    <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2 flex items-center justify-between gap-4 shadow-md">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span className="text-sm font-medium">
          <span className="hidden sm:inline">DEMO MODE — </span>
          Sample Data Only
        </span>
      </div>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="text-white hover:bg-white/20 hover:text-white gap-1 h-7 px-2"
      >
        <Link to="/">
          <X className="h-3 w-3" />
          <span className="hidden sm:inline">Exit Demo</span>
        </Link>
      </Button>
    </div>
  );
}
