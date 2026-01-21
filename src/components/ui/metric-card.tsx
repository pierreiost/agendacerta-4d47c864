// src/components/ui/metric-card.tsx
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color: 'blue' | 'green' | 'purple' | 'orange';
  className?: string;
}

const colorClasses = {
  blue: {
    gradient: 'from-primary-500/10 to-primary-600/5',
    icon: 'text-primary-600',
    iconBg: 'bg-primary-100',
    border: 'border-primary-200/50',
    trendPositive: 'text-primary-700 bg-primary-50',
    trendNegative: 'text-error-700 bg-error-50',
  },
  green: {
    gradient: 'from-success-500/10 to-success-600/5',
    icon: 'text-success-600',
    iconBg: 'bg-success-100',
    border: 'border-success-200/50',
    trendPositive: 'text-success-700 bg-success-50',
    trendNegative: 'text-error-700 bg-error-50',
  },
  purple: {
    gradient: 'from-accent-500/10 to-accent-600/5',
    icon: 'text-accent-600',
    iconBg: 'bg-accent-100',
    border: 'border-accent-200/50',
    trendPositive: 'text-accent-700 bg-accent-50',
    trendNegative: 'text-error-700 bg-error-50',
  },
  orange: {
    gradient: 'from-warning-500/10 to-warning-600/5',
    icon: 'text-warning-600',
    iconBg: 'bg-warning-100',
    border: 'border-warning-200/50',
    trendPositive: 'text-warning-700 bg-warning-50',
    trendNegative: 'text-error-700 bg-error-50',
  },
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  className,
}: MetricCardProps) {
  const colors = colorClasses[color];
  const TrendIcon = trend?.isPositive ? TrendingUp : TrendingDown;

  return (
    <Card
      className={cn(
        'relative overflow-hidden border transition-all duration-300',
        'hover:shadow-soft-lg hover:scale-[1.02]',
        colors.border,
        className
      )}
    >
      {/* Gradiente de fundo */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-50',
          colors.gradient
        )}
      />

      {/* Conteúdo */}
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          {/* Texto */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {value}
            </p>

            {/* Trend */}
            {trend && (
              <div
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
                  trend.isPositive
                    ? colors.trendPositive
                    : colors.trendNegative
                )}
              >
                <TrendIcon className="h-3 w-3" />
                <span>{trend.value}</span>
              </div>
            )}
          </div>

          {/* Ícone */}
          <div
            className={cn(
              'rounded-xl p-3 shadow-sm',
              colors.iconBg
            )}
          >
            <Icon className={cn('h-6 w-6', colors.icon)} />
          </div>
        </div>
      </div>
    </Card>
  );
}
