import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getSpaceColor } from './AgendaSidebar';
import type { Tables } from '@/integrations/supabase/types';
import type { Booking } from '@/hooks/useBookings';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  differenceInMinutes,
  isWithinInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User } from 'lucide-react';

type Space = Tables<'spaces'> & {
  category?: Tables<'categories'> | null;
};

interface WeekViewNewProps {
  date: Date;
  spaces: Space[];
  bookings: Booking[];
  allSpaces: Space[];
  onSlotClick: (spaceId: string, date: Date, hour: number) => void;
  onBookingClick: (booking: Booking) => void;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
const HOUR_HEIGHT = 60;

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-warning-100 text-warning-700 border-warning-200',
  CONFIRMED: 'bg-success-100 text-success-700 border-success-200',
  FINALIZED: 'bg-primary-100 text-primary-700 border-primary-200',
  CANCELLED: 'bg-error-100 text-error-700 border-error-200',
};

export function WeekViewNew({
  date,
  spaces,
  bookings,
  allSpaces,
  onSlotClick,
  onBookingClick,
}: WeekViewNewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const now = new Date();

  const getBookingsForDay = (day: Date, spaceId: string) => {
    return bookings.filter((booking) => {
      const bookingDate = new Date(booking.start_time);
      return isSameDay(bookingDate, day) && booking.space_id === spaceId;
    });
  };

  const getBookingPosition = (booking: Booking) => {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const durationMinutes = endMinutes - startMinutes;

    const top = ((startMinutes - 6 * 60) / 60) * HOUR_HEIGHT;
    const height = (durationMinutes / 60) * HOUR_HEIGHT;

    return { top, height: Math.max(height, 24) };
  };

  if (spaces.length === 0) {
    return (
      <Card className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <p>Nenhum espaço selecionado</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex-1 overflow-hidden shadow-soft">
      <ScrollArea className="h-full">
        <div className="min-w-[500px] md:min-w-[800px] lg:min-w-[1000px]">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-card border-b border-border">
            <div className="flex">
              <div className="w-10 md:w-14 lg:w-16 flex-shrink-0 border-r border-border" />
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'flex-1 p-1.5 md:p-2 lg:p-3 text-center border-r border-border last:border-r-0',
                    isToday(day) && 'bg-primary/5'
                  )}
                >
                  <div className="text-[10px] md:text-xs text-muted-foreground uppercase">
                    {format(day, 'EEE', { locale: ptBR })}
                  </div>
                  <div
                    className={cn(
                      'text-sm md:text-lg font-semibold mt-0.5 md:mt-1',
                      isToday(day) && 'text-primary'
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grid for each space */}
          {spaces.map((space) => {
            const spaceIndex = allSpaces.findIndex((s) => s.id === space.id);
            const colors = getSpaceColor(spaceIndex);

            return (
              <div key={space.id} className="border-b border-border last:border-b-0">
                {/* Space name header */}
                <div className="flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 bg-muted/30 border-b border-border sticky left-0">
                  <div className={cn('w-2 h-2 md:w-3 md:h-3 rounded-full flex-shrink-0', colors.dot)} />
                  <span className="font-medium text-xs md:text-sm truncate">{space.name}</span>
                </div>

                {/* Time grid */}
                <div className="relative flex">
                  {/* Time labels */}
                  <div className="w-10 md:w-14 lg:w-16 flex-shrink-0 border-r border-border">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="border-b border-border text-right pr-1 md:pr-2 text-[9px] md:text-xs text-muted-foreground flex items-start justify-end pt-0.5"
                        style={{ height: HOUR_HEIGHT }}
                      >
                        {format(new Date().setHours(hour, 0), 'HH:mm')}
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day) => {
                    const dayBookings = getBookingsForDay(day, space.id);

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          'flex-1 relative border-r border-border last:border-r-0 min-w-[50px]',
                          isToday(day) && 'bg-primary/5'
                        )}
                      >
                        {/* Hour slots */}
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            className="border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                            style={{ height: HOUR_HEIGHT }}
                            onClick={() => onSlotClick(space.id, day, hour)}
                          />
                        ))}

                        {/* Bookings */}
                        {dayBookings.map((booking) => {
                          const { top, height } = getBookingPosition(booking);
                          const isNow =
                            isToday(day) &&
                            isWithinInterval(now, {
                              start: new Date(booking.start_time),
                              end: new Date(booking.end_time),
                            });

                          return (
                            <div
                              key={booking.id}
                              className={cn(
                                'absolute left-0.5 right-0.5 md:left-1 md:right-1 rounded border-l-2 md:border-l-4 p-0.5 md:p-1 cursor-pointer',
                                'transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:z-10',
                                colors.bg,
                                colors.border,
                                isNow && 'ring-2 ring-primary/50'
                              )}
                              style={{ top, height }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onBookingClick(booking);
                              }}
                            >
                              <div className="flex items-center gap-0.5 md:gap-1 text-[9px] md:text-xs font-medium truncate">
                                <User className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0 hidden sm:block" />
                                <span className="truncate">
                                  {booking.customer_name || 'Cliente'}
                                </span>
                              </div>
                              {height >= 35 && (
                                <div className="text-[8px] md:text-[10px] text-muted-foreground mt-0.5 hidden sm:block">
                                  {format(new Date(booking.start_time), 'HH:mm')} -{' '}
                                  {format(new Date(booking.end_time), 'HH:mm')}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}
