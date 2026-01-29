import { StatsSection as StatsSectionType } from '@/types/public-page';
import { Calendar, Users, CheckCircle2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsSectionProps {
  section: StatsSectionType;
}

export function StatsSection({ section }: StatsSectionProps) {
  if (!section.enabled) return null;

  const stats = [];

  if (section.years_in_business) {
    stats.push({
      icon: Calendar,
      value: `${section.years_in_business}+`,
      label: 'Anos no mercado',
    });
  }

  if (section.customers_served) {
    stats.push({
      icon: Users,
      value: section.customers_served.toLocaleString('pt-BR') + '+',
      label: 'Clientes atendidos',
    });
  }

  if (section.bookings_completed) {
    stats.push({
      icon: CheckCircle2,
      value: section.bookings_completed.toLocaleString('pt-BR') + '+',
      label: 'Agendamentos realizados',
    });
  }

  section.custom_stats.forEach((stat, index) => {
    stats.push({
      icon: TrendingUp,
      value: stat.value,
      label: stat.label,
      isCustom: true,
    });
  });

  if (stats.length === 0) return null;

  return (
    <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <div className="mx-auto max-w-6xl">
        <div
          className={cn(
            "grid gap-8 text-center",
            stats.length === 1 && "grid-cols-1",
            stats.length === 2 && "grid-cols-2",
            stats.length === 3 && "grid-cols-1 sm:grid-cols-3",
            stats.length >= 4 && "grid-cols-2 md:grid-cols-4"
          )}
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="flex flex-col items-center p-6"
              >
                <div className="mb-4 p-4 rounded-full bg-primary/10">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <span className="text-4xl md:text-5xl font-bold text-primary mb-2">
                  {stat.value}
                </span>
                <span className="text-muted-foreground font-medium">
                  {stat.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
