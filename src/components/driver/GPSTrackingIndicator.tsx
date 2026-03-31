import { cn } from '@/lib/utils';

interface GPSTrackingIndicatorProps {
  isTracking: boolean;
  className?: string;
}

export function GPSTrackingIndicator({ isTracking, className }: GPSTrackingIndicatorProps) {
  if (!isTracking) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
      </span>
      <span className="text-xs font-medium text-green-700">GPS Active</span>
    </div>
  );
}
