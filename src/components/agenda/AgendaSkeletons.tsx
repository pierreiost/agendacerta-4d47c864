import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);
const HOUR_HEIGHT_DAY = 56;
const HOUR_HEIGHT_WEEK = 48;

/**
 * Skeleton para DayView - Grade de horários com blocos de reserva
 */
export function DayViewSkeleton() {
  return (
    <Card className="flex-1 overflow-hidden shadow-soft animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border">
        <div className="flex items-center justify-center p-3 md:p-4">
          <Skeleton className="h-6 w-48 md:w-64" />
        </div>
      </div>

      {/* Grade de horários */}
      <div className="relative">
        {HOURS.map((hour) => (
          <div key={hour} className="flex" style={{ height: HOUR_HEIGHT_DAY }}>
            {/* Label da hora */}
            <div className="w-14 md:w-16 flex-shrink-0 border-r border-border p-1 md:p-2 flex items-start justify-end">
              <Skeleton className="h-3 w-8" />
            </div>
            {/* Área de slots */}
            <div className="flex-1 border-b border-border" />
          </div>
        ))}

        {/* Skeleton de reservas */}
        <div
          className="absolute rounded-md md:rounded-lg border-l-4 border-l-primary/30 p-2"
          style={{
            top: 2 * HOUR_HEIGHT_DAY + 14,
            left: 64,
            right: 8,
            height: HOUR_HEIGHT_DAY * 1.5,
          }}
        >
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2 mb-1" />
          <Skeleton className="h-3 w-1/3" />
        </div>

        <div
          className="absolute rounded-md md:rounded-lg border-l-4 border-l-muted-foreground/30 p-2"
          style={{
            top: 5 * HOUR_HEIGHT_DAY + 8,
            left: 64,
            right: 8,
            height: HOUR_HEIGHT_DAY * 2,
          }}
        >
          <Skeleton className="h-4 w-2/3 mb-2" />
          <Skeleton className="h-3 w-1/2 mb-1" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Skeleton para WeekViewNew - Dias da semana com reservas
 */
export function WeekViewSkeleton() {
  const weekDays = Array.from({ length: 7 }, (_, i) => i);

  return (
    <Card className="flex-1 overflow-hidden shadow-soft animate-fade-in">
      {/* Header - Dias da semana */}
      <div className="sticky top-0 z-20 bg-card border-b border-border">
        <div className="flex">
          <div className="w-12 md:w-16 flex-shrink-0 border-r border-border" />
          {weekDays.map((day) => (
            <div
              key={day}
              className="flex-1 p-2 md:p-3 text-center border-r border-border last:border-r-0"
            >
              <Skeleton className="h-3 w-6 mx-auto mb-1" />
              <Skeleton className="h-5 w-5 mx-auto rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Grade */}
      <div className="relative flex">
        {/* Coluna de horários */}
        <div className="w-12 md:w-16 flex-shrink-0 border-r border-border">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="border-b border-border flex items-start justify-end pr-1 md:pr-2 pt-1"
              style={{ height: HOUR_HEIGHT_WEEK }}
            >
              <Skeleton className="h-2.5 w-7" />
            </div>
          ))}
        </div>

        {/* Colunas dos dias */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="flex-1 relative border-r border-border last:border-r-0"
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="border-b border-border"
                style={{ height: HOUR_HEIGHT_WEEK }}
              />
            ))}

            {/* Skeleton de reservas - posicionamento variado */}
            {day % 2 === 0 && (
              <div
                className="absolute left-1 right-1 rounded border-l-2 border-l-primary/30 p-1"
                style={{
                  top: (1 + day) * HOUR_HEIGHT_WEEK,
                  height: HOUR_HEIGHT_WEEK * 1.5,
                }}
              >
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-2 w-2/3" />
              </div>
            )}
            {day % 3 === 0 && (
              <div
                className="absolute left-1 right-1 rounded border-l-2 border-l-muted-foreground/30 p-1"
                style={{
                  top: 6 * HOUR_HEIGHT_WEEK,
                  height: HOUR_HEIGHT_WEEK,
                }}
              >
                <Skeleton className="h-3 w-3/4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Skeleton para MonthView - Calendário mensal
 */
export function MonthViewSkeleton() {
  const weeks = Array.from({ length: 5 }, (_, i) => i);
  const days = Array.from({ length: 7 }, (_, i) => i);
  const weekDayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const weekDayNamesShort = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <Card className="flex-1 shadow-soft overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDayNames.map((day, i) => (
          <div
            key={day}
            className="p-1.5 md:p-3 text-center text-[10px] md:text-sm font-medium text-muted-foreground bg-muted/30"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{weekDayNamesShort[i]}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1">
        {weeks.map((weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {days.map((dayIndex) => {
              const hasBookings = (weekIndex + dayIndex) % 3 === 0;
              const dayNumber = weekIndex * 7 + dayIndex - 3;
              const isOutsideMonth = dayNumber < 1 || dayNumber > 30;

              return (
                <div
                  key={dayIndex}
                  className={cn(
                    'min-h-[50px] md:min-h-[70px] p-1 md:p-1.5 border-r border-border last:border-r-0',
                    isOutsideMonth && 'bg-muted/20'
                  )}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-0.5 md:mb-2">
                    <Skeleton className="h-4 w-4 md:h-5 md:w-5 rounded" />
                    {hasBookings && (
                      <Skeleton className="h-4 w-4 rounded" />
                    )}
                  </div>

                  {/* Dots */}
                  {hasBookings && (
                    <div className="flex gap-0.5 md:gap-1 mb-0.5 md:mb-2">
                      <Skeleton className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" />
                      <Skeleton className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" />
                    </div>
                  )}

                  {/* Booking previews - hidden on mobile */}
                  <div className="hidden sm:block space-y-0.5 md:space-y-1">
                    {hasBookings && (
                      <>
                        <Skeleton className="h-4 w-full rounded" />
                        <Skeleton className="h-4 w-3/4 rounded" />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}
