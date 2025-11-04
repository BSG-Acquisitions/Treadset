import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useHaulerReliability } from '@/hooks/useHaulerReliability';

interface HaulerReliabilityBadgeProps {
  haulerId: string;
  size?: 'sm' | 'default';
  showIcon?: boolean;
}

export const HaulerReliabilityBadge = ({
  haulerId,
  size = 'sm',
  showIcon = true,
}: HaulerReliabilityBadgeProps) => {
  const { getScoreForHauler, getScoreBadgeVariant } = useHaulerReliability();
  const reliability = getScoreForHauler(haulerId);

  if (!reliability) {
    return (
      <Badge variant="outline" className={size === 'sm' ? 'text-xs' : ''}>
        N/A
      </Badge>
    );
  }

  const getIcon = () => {
    if (!showIcon) return null;
    
    if (reliability.reliability_score >= 85) {
      return <CheckCircle className="h-3 w-3" />;
    } else if (reliability.reliability_score >= 70) {
      return <AlertCircle className="h-3 w-3" />;
    } else {
      return <XCircle className="h-3 w-3" />;
    }
  };

  const getBadgeColor = () => {
    if (reliability.reliability_score >= 85) {
      return 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300';
    } else if (reliability.reliability_score >= 70) {
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300';
    } else {
      return 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300';
    }
  };

  const tooltipContent = (
    <div className="space-y-1 text-xs">
      <div className="font-semibold">Reliability Score: {reliability.reliability_score}</div>
      <div>On-Time Rate: {reliability.on_time_rate.toFixed(1)}% (40% weight)</div>
      <div>Manifest Accuracy: {reliability.manifest_accuracy_rate.toFixed(1)}% (30% weight)</div>
      <div>Payment Promptness: {reliability.payment_promptness_rate.toFixed(1)}% (30% weight)</div>
      <div className="pt-1 border-t mt-1">
        Based on {reliability.total_dropoffs} dropoff{reliability.total_dropoffs !== 1 ? 's' : ''}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline"
            className={`${getBadgeColor()} flex items-center gap-1 ${size === 'sm' ? 'text-xs' : ''}`}
          >
            {getIcon()}
            {reliability.reliability_score}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
