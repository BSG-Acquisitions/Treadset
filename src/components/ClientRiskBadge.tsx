import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ClientRiskBadgeProps {
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  pickupDecline?: number | null;
  paymentDelay?: number | null;
  contactGap?: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export const ClientRiskBadge = ({ 
  score, 
  riskLevel, 
  pickupDecline,
  paymentDelay,
  contactGap,
  size = 'md' 
}: ClientRiskBadgeProps) => {
  const getVariant = () => {
    if (riskLevel === 'high') return 'destructive';
    if (riskLevel === 'medium') return 'outline';
    return 'default';
  };

  const getIcon = () => {
    if (riskLevel === 'high') return <AlertTriangle className="h-3 w-3" />;
    if (riskLevel === 'medium') return <TrendingDown className="h-3 w-3" />;
    return <CheckCircle className="h-3 w-3" />;
  };

  const getColor = () => {
    if (score <= 40) return 'text-green-600';
    if (score <= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const sizeClass = size === 'sm' ? 'text-xs px-2' : size === 'lg' ? 'text-base px-4' : 'text-sm px-3';

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-semibold">Churn Risk: {score}/100</div>
      {pickupDecline !== null && pickupDecline !== undefined && (
        <div className="text-xs">Pickup decline: {pickupDecline.toFixed(1)}%</div>
      )}
      {paymentDelay !== null && paymentDelay !== undefined && (
        <div className="text-xs">Avg payment delay: {paymentDelay.toFixed(0)} days</div>
      )}
      {contactGap !== null && contactGap !== undefined && (
        <div className="text-xs">Contact gap ratio: {contactGap.toFixed(1)}x</div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={getVariant()} className={`${sizeClass} gap-1 cursor-help`}>
            {getIcon()}
            <span className={getColor()}>Risk: {score}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};