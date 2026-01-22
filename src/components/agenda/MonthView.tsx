import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getSpaceColor } from './AgendaSidebar';
import type { Tables } from '@/integrations/supabase/types';
import type { Booking } from '@/hooks/useBookings';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Space = Tables<'spaces'> & {
  category?: Tables<'categories'> | null;
};

interface MonthViewProps {
  date: Date;
  spaces: Space[];
  bookings: Booking[];
  allSpaces: Space[];
  onDayClick: (date: Date) => void;
}

export function MonthView({
  date,
  spaces,
  bookings,
  allSpaces,
  onDayClick,
}: MonthViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let currentDay = calendarStart;

    while (currentDay <= calendarEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(currentDay);
        currentDay = addDays(currentDay, 1);
      }
      result.push(week);
    }

    return result;
  }, [calendarStart, calendarEnd]);

  const getBookingsForDay = (day: Date) => {
    return bookings.filter((booking) => {
      const bookingDate = new Date(booking.start_time);
      return isSameDay(bookingDate, day);
    });
  };

  const getSpaceDotsForDay = (day: Date) => {
    const dayBookings = getBookingsForDay(day);
    const spaceIds = [...new Set(dayBookings.map((b) => b.space_id))];
    return spaceIds.map((id) => {
      const index = allSpaces.findIndex((s) => s.id === id);
      return getSpaceColor(index);
    });
  };

  const weekDayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card className="flex-1 shadow-soft overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDayNames.map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-medium text-muted-foreground bg-muted/30"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-rows-[repeat(auto-fill,minmax(100px,1fr))]">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((day) => {
              const dayBookings = getBookingsForDay(day);
              const spaceDots = getSpaceDotsForDay(day);
              const isCurrentMonth = isSameMonth(day, date);
              const today = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[100px] p-2 border-r border-border last:border-r-0 cursor-pointer',
                    'transition-colors duration-200 hover:bg-muted/50',
                    !isCurrentMonth && 'bg-muted/20 text-muted-foreground',
                    today && 'bg-primary-50/50'
                  )}
                  onClick={() => onDayClick(day)}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        today && 'bg-primary-500 text-white rounded-full w-7 h-7 flex items-center justify-center'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayBookings.length > 0 && (
                      <Badge variant="secondary" className="text-xs px-1.5">
                        {dayBookings.length}
                      </Badge>
                    )}
                  </div>

                  {/* Space dots */}
                  {spaceDots.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {spaceDots.slice(0, 4).map((colors, i) => (
                        <div
                          key={i}
                          className={cn('w-2 h-2 rounded-full', colors.dot)}
                        />
                      ))}
                      {spaceDots.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{spaceDots.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Booking previews */}
                  <div className="space-y-1">
                    {dayBookings.slice(0, 2).map((booking) => {
                      const spaceIndex = allSpaces.findIndex((s) => s.id === booking.space_id);
                      const colors = getSpaceColor(spaceIndex);

                      return (
                        <div
                          key={booking.id}
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded truncate border-l-2',
                            colors.bg,
                            colors.border
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDayClick(day);
                          }}
                        >
                          {format(new Date(booking.start_time), 'HH:mm')} -{' '}
                          {booking.customer_name || 'Cliente'}
                        </div>
                      );
                    })}
                    {dayBookings.length > 2 && (
                      <div className="text-[10px] text-muted-foreground pl-1">
                        +{dayBookings.length - 2} mais
                      </div>
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
