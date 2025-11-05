import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'accent';
  className?: string;
  onClick?: () => void;
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  changeLabel = "vs last month",
  icon, 
  variant = 'default',
  className = "",
  onClick
}: StatsCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          cardClass: 'border-brand-primary/20 bg-gradient-to-br from-card to-brand-primary/5',
          iconBg: 'bg-brand-primary/15 text-brand-primary',
          valueColor: 'text-brand-primary'
        };
      case 'success':
        return {
          cardClass: 'border-brand-success/20 bg-gradient-to-br from-card to-brand-success/5',
          iconBg: 'bg-brand-success/15 text-brand-success',
          valueColor: 'text-brand-success'
        };
      case 'warning':
        return {
          cardClass: 'border-brand-warning/20 bg-gradient-to-br from-card to-brand-warning/5',
          iconBg: 'bg-brand-warning/15 text-brand-warning',
          valueColor: 'text-brand-warning'
        };
      case 'accent':
        return {
          cardClass: 'border-brand-accent/20 bg-gradient-to-br from-card to-brand-accent/5',
          iconBg: 'bg-brand-accent/15 text-brand-accent',
          valueColor: 'text-brand-accent'
        };
      default:
        return {
          cardClass: 'border-border/20 bg-gradient-to-br from-card to-card-hover',
          iconBg: 'bg-secondary/50 text-muted-foreground',
          valueColor: 'text-foreground'
        };
    }
  };

  const styles = getVariantStyles();
  
  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return <TrendingUp className="w-3 h-3" />;
    if (change < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (change === undefined) return '';
    if (change > 0) return 'text-brand-success';
    if (change < 0) return 'text-brand-warning';
    return 'text-muted-foreground';
  };

  return (
    <Card 
      className={`
        interactive-card overflow-hidden relative
        ${styles.cardClass}
        ${className}
        ${onClick ? 'cursor-pointer hover:shadow-lg transition-all duration-200' : ''}
      `}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
              {title}
            </p>
            <div className="space-y-1">
              <p className={`text-3xl font-bold tracking-tight ${styles.valueColor}`}>
                {value}
              </p>
              {change !== undefined && (
                <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
                  {getTrendIcon()}
                  <span className="font-medium">
                    {change > 0 ? '+' : ''}{change}%
                  </span>
                  <span className="text-muted-foreground font-normal">
                    {changeLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {icon && (
            <div className={`p-3 rounded-xl ${styles.iconBg} shadow-sm`}>
              {icon}
            </div>
          )}
        </div>
        
        {/* Subtle pattern overlay */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5 overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-current to-transparent rotate-12 transform scale-150" />
        </div>
      </CardContent>
    </Card>
  );
}