import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, RefreshCw } from 'lucide-react';

export function FixGeocodingButton() {
  const [isFixing, setIsFixing] = useState(false);

  const fixGeocodingIssues = async () => {
    setIsFixing(true);
    try {
      toast.info('Starting geocoding fix... This may take a few minutes.');
      
      const { data, error } = await supabase.functions.invoke('fix-geocoding');

      if (error) throw error;

      toast.success(data.message || 'Geocoding fix completed successfully');
      
      // Reload the page to see updated routes
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      console.error('Fix geocoding error:', error);
      toast.error(error.message || 'Failed to fix geocoding issues');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Button
      onClick={fixGeocodingIssues}
      disabled={isFixing}
      variant="outline"
      size="sm"
    >
      {isFixing ? (
        <>
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Fixing...
        </>
      ) : (
        <>
          <MapPin className="mr-2 h-4 w-4" />
          Fix Geocoding
        </>
      )}
    </Button>
  );
}
