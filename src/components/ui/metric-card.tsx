// src/components/ui/metric-card.tsx
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Sparkline } from '@/components/ui/sparkline';
import { cn } from '@/lib/utils';

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
}

const colorClasses = {
  blue: {
    gradient: 'from-primary-100 via-primary-50 to-transparent',
    icon: 'text-primary-600',
    iconBg: 'bg-primary-100 ring-2 ring-primary-200/50',
    border: 'border-primary-200/60 hover:border-primary-300',
    sparkline: 'hsl(239 84% 67%)',
    trendPositive: 'text-success-700 bg-success-100',
    trendNegative: 'text-error-700 bg-error-100',
  },
  green: {
    gradient: 'from-success-100 via-success-50 to-transparent',
    icon: 'text-success-600',
    iconBg: 'bg-success-100 ring-2 ring-success-200/50',
    border: 'border-success-200/60 hover:border-success-300',
    sparkline: 'hsl(160 84% 39%)',
    trendPositive: 'text-success-700 bg-success-100',
    trendNegative: 'text-error-700 bg-error-100',
  },
  purple: {
    gradient: 'from-accent-100 via-accent-50 to-transparent',
    icon: 'text-accent-600',
    iconBg: 'bg-accent-100 ring-2 ring-accent-200/50',
    border: 'border-accent-200/60 hover:border-accent-300',
    sparkline: 'hsl(239 84% 60%)',
    trendPositive: 'text-success-700 bg-success-100',
    trendNegative: 'text-error-700 bg-error-100',
  },
  orange: {
    gradient: 'from-warning-100 via-warning-50 to-transparent',
    icon: 'text-warning-600',
    iconBg: 'bg-warning-100 ring-2 ring-warning-200/50',
    border: 'border-warning-200/60 hover:border-warning-300',
    sparkline: 'hsl(38 92% 50%)',
    trendPositive: 'text-success-700 bg-success-100',
    trendNegative: 'text-error-700 bg-error-100',
  },
  brand: {
    gradient: 'from-brand-100 via-brand-50 to-transparent',
    icon: 'text-brand-600',
    iconBg: 'bg-brand-100 ring-2 ring-brand-200/50',
    border: 'border-brand-200/60 hover:border-brand-300',
    sparkline: 'hsl(38 92% 50%)',
    trendPositive: 'text-success-700 bg-success-100',
    trendNegative: 'text-error-700 bg-error-100',
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

      {/* Conteúdo */}
      <div className="relative p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          {/* Texto */}
          <div className="flex-1 space-y-1">
            <p className="text-xs md:text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {value}
            </p>

            {/* Sparkline ou Trend */}
            {sparklineData && sparklineData.length > 0 ? (
              <div className="pt-2">
                <Sparkline 
                  data={sparklineData} 
                  color={colors.sparkline} 
                  height={28}
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

          {/* Ícone premium */}
          <div
            className={cn(
              'rounded-xl p-2.5 md:p-3 shadow-sm',
              colors.iconBg
            )}
          >
            <Icon className={cn('h-5 w-5 md:h-6 md:w-6', colors.icon)} />
          </div>
        </div>
      </div>
    </Card>
  );
}
