import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface ClientHealthBadgeProps {
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  size?: 'sm' | 'md' | 'lg';
}

export const ClientHealthBadge = ({ score, riskLevel, size = 'md' }: ClientHealthBadgeProps) => {
  const getVariant = () => {
    if (riskLevel === 'high') return 'destructive';
    if (riskLevel === 'medium') return 'outline';
    return 'default';
  };

  const getIcon = () => {
    if (riskLevel === 'high') return <AlertTriangle className="h-3 w-3" />;
    if (score >= 70) return <TrendingUp className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
  };

  const sizeClass = size === 'sm' ? 'text-xs px-2' : size === 'lg' ? 'text-base px-4' : 'text-sm px-3';

  return (
    <Badge variant={getVariant()} className={`${sizeClass} gap-1`}>
      {getIcon()}
      Health: {score}
      <span className="text-xs opacity-75">(Beta)</span>
    </Badge>
  );
};
