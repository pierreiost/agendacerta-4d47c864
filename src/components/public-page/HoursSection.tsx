import { HoursSection as HoursSectionType } from '@/types/public-page';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HoursSectionProps {
  section: HoursSectionType;
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function HoursSection({ section }: HoursSectionProps) {
  if (!section.enabled) return null;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  return (
    <section className="py-16 md:py-24 px-4 bg-muted/30">
      <div className="mx-auto max-w-lg">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {section.title || 'Horários de Funcionamento'}
          </h2>
        </div>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          {DAY_ORDER.map((day, index) => {
            const schedule = section.schedule[day as keyof typeof section.schedule];
            const isToday = day === today;

            return (
              <div
                key={day}
                className={cn(
                  "flex items-center justify-between px-5 py-4",
                  index !== DAY_ORDER.length - 1 && "border-b",
                  isToday && "bg-primary/5"
                )}
              >
                <div className="flex items-center gap-3">
                  {isToday && (
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  )}
                  <span className={cn("font-medium", isToday && "text-primary")}>
                    {DAY_LABELS[day]}
                  </span>
                </div>
                <span
                  className={cn(
                    schedule.closed ? "text-muted-foreground" : "font-semibold",
                    isToday && !schedule.closed && "text-primary"
                  )}
                >
                  {schedule.closed
                    ? "Fechado"
                    : `${schedule.open} - ${schedule.close}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
