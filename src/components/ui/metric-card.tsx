// src/components/ui/metric-card.tsx
import { LucideIcon, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Sparkline } from '@/components/ui/sparkline';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  sparklineData?: number[];
  color: 'blue' | 'green' | 'purple' | 'orange' | 'brand';
  className?: string;
  tooltip?: string;
}

const colorClasses = {
  blue: {
    gradient: 'from-primary-100/80 via-primary-50/50 to-transparent dark:from-primary-900/40 dark:via-primary-800/20 dark:to-transparent',
    icon: 'text-primary-600 dark:text-primary-400',
    iconBg: 'bg-primary-100 ring-2 ring-primary-200/50 dark:bg-primary-900/50 dark:ring-primary-700/50',
    border: 'border-primary-200/60 hover:border-primary-300 dark:border-primary-800/60 dark:hover:border-primary-700',
    sparkline: 'hsl(239 84% 67%)',
    trendPositive: 'text-success-700 bg-success-100 dark:text-success-400 dark:bg-success-900/50',
    trendNegative: 'text-error-700 bg-error-100 dark:text-error-400 dark:bg-error-900/50',
  },
  green: {
    gradient: 'from-success-100/80 via-success-50/50 to-transparent dark:from-success-900/40 dark:via-success-800/20 dark:to-transparent',
    icon: 'text-success-600 dark:text-success-400',
    iconBg: 'bg-success-100 ring-2 ring-success-200/50 dark:bg-success-900/50 dark:ring-success-700/50',
    border: 'border-success-200/60 hover:border-success-300 dark:border-success-800/60 dark:hover:border-success-700',
    sparkline: 'hsl(160 84% 39%)',
    trendPositive: 'text-success-700 bg-success-100 dark:text-success-400 dark:bg-success-900/50',
    trendNegative: 'text-error-700 bg-error-100 dark:text-error-400 dark:bg-error-900/50',
  },
  purple: {
    gradient: 'from-accent-100/80 via-accent-50/50 to-transparent dark:from-accent-900/40 dark:via-accent-800/20 dark:to-transparent',
    icon: 'text-accent-600 dark:text-accent-400',
    iconBg: 'bg-accent-100 ring-2 ring-accent-200/50 dark:bg-accent-900/50 dark:ring-accent-700/50',
    border: 'border-accent-200/60 hover:border-accent-300 dark:border-accent-800/60 dark:hover:border-accent-700',
    sparkline: 'hsl(239 84% 60%)',
    trendPositive: 'text-success-700 bg-success-100 dark:text-success-400 dark:bg-success-900/50',
    trendNegative: 'text-error-700 bg-error-100 dark:text-error-400 dark:bg-error-900/50',
  },
  orange: {
    gradient: 'from-warning-100/80 via-warning-50/50 to-transparent dark:from-warning-900/40 dark:via-warning-800/20 dark:to-transparent',
    icon: 'text-warning-600 dark:text-warning-400',
    iconBg: 'bg-warning-100 ring-2 ring-warning-200/50 dark:bg-warning-900/50 dark:ring-warning-700/50',
    border: 'border-warning-200/60 hover:border-warning-300 dark:border-warning-800/60 dark:hover:border-warning-700',
    sparkline: 'hsl(38 92% 50%)',
    trendPositive: 'text-success-700 bg-success-100 dark:text-success-400 dark:bg-success-900/50',
    trendNegative: 'text-error-700 bg-error-100 dark:text-error-400 dark:bg-error-900/50',
  },
  brand: {
    gradient: 'from-brand-100/80 via-brand-50/50 to-transparent dark:from-brand-900/40 dark:via-brand-800/20 dark:to-transparent',
    icon: 'text-brand-600 dark:text-brand-400',
    iconBg: 'bg-brand-100 ring-2 ring-brand-200/50 dark:bg-brand-900/50 dark:ring-brand-700/50',
    border: 'border-brand-200/60 hover:border-brand-300 dark:border-brand-800/60 dark:hover:border-brand-700',
    sparkline: 'hsl(38 92% 50%)',
    trendPositive: 'text-success-700 bg-success-100 dark:text-success-400 dark:bg-success-900/50',
    trendNegative: 'text-error-700 bg-error-100 dark:text-error-400 dark:bg-error-900/50',
  },
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  sparklineData,
  color,
  className,
  tooltip,
}: MetricCardProps) {
  const colors = colorClasses[color];

  return (
    <Card
      className={cn(
        'relative overflow-hidden border-2 transition-all duration-300',
        'hover:shadow-soft-lg hover:scale-[1.02] hover:-translate-y-0.5',
        colors.border,
        className
      )}
    >
      {/* Gradiente de fundo premium */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-60',
          colors.gradient
        )}
      />

      {/* Conteúdo - Compacto */}
      <div className="relative p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          {/* Texto */}
          <div className="flex-1 space-y-0.5">
            <div className="flex items-center gap-1">
              <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {title}
              </p>
              {tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/60 cursor-help hover:text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-xs">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              {value}
            </p>

            {/* Sparkline ou Trend */}
            {sparklineData && sparklineData.length > 0 ? (
              <div className="pt-1">
                <Sparkline 
                  data={sparklineData} 
                  color={colors.sparkline} 
                  height={22}
                />
              </div>
            ) : trend && (
              <div className="pt-1">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
                    trend.isPositive ? colors.trendPositive : colors.trendNegative
                  )}
                >
                  <span>{trend.isPositive ? '↑' : '↓'}</span>
                  <span>{trend.value}</span>
                </span>
              </div>
            )}
          </div>

          {/* Ícone premium - compacto */}
          <div
            className={cn(
              'rounded-lg p-2 md:p-2.5 shadow-sm',
              colors.iconBg
            )}
          >
            <Icon className={cn('h-4 w-4 md:h-5 md:w-5', colors.icon)} />
          </div>
        </div>
      </div>
    </Card>
  );
}
