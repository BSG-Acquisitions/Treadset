import { cn } from '@/lib/utils';
import { AlertTriangle, Package } from 'lucide-react';

interface StockLevelIndicatorProps {
  currentQuantity: number;
  lowStockThreshold?: number | null;
  unitOfMeasure: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StockLevelIndicator({
  currentQuantity,
  lowStockThreshold,
  unitOfMeasure,
  size = 'md',
}: StockLevelIndicatorProps) {
  const isOutOfStock = currentQuantity <= 0;
  const isLowStock = lowStockThreshold && currentQuantity > 0 && currentQuantity <= lowStockThreshold;

  const formatUnit = (unit: string) => {
    switch (unit) {
      case 'cubic_yards':
        return 'yd³';
      case 'tons':
        return 'tons';
      case 'lbs':
        return 'lbs';
      case 'units':
        return 'units';
      case 'pallets':
        return 'pallets';
      default:
        return unit;
    }
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
  };

  if (isOutOfStock) {
    return (
      <div className={cn('flex items-center gap-1.5 text-destructive', sizeClasses[size])}>
        <Package className="h-4 w-4" />
        <span>Out of Stock</span>
      </div>
    );
  }

  if (isLowStock) {
    return (
      <div className={cn('flex items-center gap-1.5 text-orange-600', sizeClasses[size])}>
        <AlertTriangle className="h-4 w-4" />
        <span>
          {currentQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} {formatUnit(unitOfMeasure)}
        </span>
        <span className="text-xs text-muted-foreground">(Low)</span>
      </div>
    );
  }

  return (
    <div className={cn('text-foreground', sizeClasses[size])}>
      {currentQuantity.toLocaleString(undefined, { maximumFractionDigits: 2 })} {formatUnit(unitOfMeasure)}
    </div>
  );
}
