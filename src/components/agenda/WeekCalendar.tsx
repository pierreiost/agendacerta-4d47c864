import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { format, addDays, isSameDay, isToday, parseISO, getHours, getMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Space } from '@/hooks/useSpaces';
import type { Booking } from '@/hooks/useBookings';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6:00 to 23:00
const HOUR_HEIGHT = 60; // pixels per hour

interface WeekCalendarProps {
  spaces: Space[];
  bookings: Booking[];
  weekStart: Date;
  onSlotClick: (spaceId: string, date: Date, hour: number) => void;
  onBookingClick: (booking: Booking) => void;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-500/90 hover:bg-amber-500 border-amber-600',
  CONFIRMED: 'bg-emerald-500/90 hover:bg-emerald-500 border-emerald-600',
  CANCELLED: 'bg-red-500/90 hover:bg-red-500 border-red-600',
  FINALIZED: 'bg-blue-500/90 hover:bg-blue-500 border-blue-600',
};

export function WeekCalendar({
  spaces,
  bookings,
  weekStart,
  onSlotClick,
  onBookingClick,
}: WeekCalendarProps) {
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const getBookingsForCell = (spaceId: string, day: Date) => {
    return bookings.filter((booking) => {
      if (booking.space_id !== spaceId) return false;
      const bookingStart = parseISO(booking.start_time);
      return isSameDay(bookingStart, day);
    });
  };

  const getBookingPosition = (booking: Booking) => {
    const start = parseISO(booking.start_time);
    const end = parseISO(booking.end_time);
    
    const startHour = getHours(start) + getMinutes(start) / 60;
    const endHour = getHours(end) + getMinutes(end) / 60;
    
    const top = (startHour - 6) * HOUR_HEIGHT;
    const height = (endHour - startHour) * HOUR_HEIGHT;
    
    return { top, height };
  };

  return (
    <Card className="overflow-hidden">
      <ScrollArea className="w-full">
        <div className="min-w-[900px]">
          {/* Header */}
          <div className="grid border-b" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
            <div className="border-r p-2 text-center text-sm font-medium text-muted-foreground">
              Horário
            </div>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  'border-r p-2 text-center last:border-r-0',
                  isToday(day) && 'bg-primary/5'
                )}
              >
                <div className="text-sm font-medium">
                  {format(day, 'EEEE', { locale: ptBR })}
                </div>
                <div
                  className={cn(
                    'text-2xl font-bold',
                    isToday(day) && 'text-primary'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Body */}
          {spaces.map((space) => (
            <div key={space.id} className="border-b last:border-b-0">
              {/* Space Header */}
              <div className="grid border-b bg-muted/30" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
                <div className="border-r p-2 flex items-center gap-2">
                  {space.category?.color && (
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: space.category.color }}
                    />
                  )}
                  <span className="text-sm font-medium truncate">{space.name}</span>
                </div>
                <div className="col-span-7" />
              </div>

              {/* Time Grid */}
              <div className="grid" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
                {/* Hour labels */}
                <div className="border-r">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-b last:border-b-0 text-xs text-muted-foreground text-right pr-2 pt-1"
                      style={{ height: HOUR_HEIGHT }}
                    >
                      {hour}:00
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {days.map((day) => {
                  const dayBookings = getBookingsForCell(space.id, day);
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'border-r last:border-r-0 relative',
                        isToday(day) && 'bg-primary/5'
                      )}
                      style={{ height: HOURS.length * HOUR_HEIGHT }}
                    >
                      {/* Hour slots */}
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="absolute w-full border-b cursor-pointer hover:bg-primary/10 transition-colors"
                          style={{
                            top: (hour - 6) * HOUR_HEIGHT,
                            height: HOUR_HEIGHT,
                          }}
                          onClick={() => onSlotClick(space.id, day, hour)}
                        />
                      ))}

                      {/* Bookings */}
                      {dayBookings.map((booking) => {
                        const { top, height } = getBookingPosition(booking);
                        const statusClass = STATUS_COLORS[booking.status] || STATUS_COLORS.PENDING;
                        
                        return (
                          <div
                            key={booking.id}
                            className={cn(
                              'absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer border text-white shadow-sm transition-all overflow-hidden',
                              statusClass
                            )}
                            style={{
                              top: top + 1,
                              height: Math.max(height - 2, 24),
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onBookingClick(booking);
                            }}
                          >
                            <div className="text-xs font-medium truncate">
                              {booking.customer_name}
                            </div>
                            {height > 40 && (
                              <div className="text-xs opacity-90 truncate">
                                {format(parseISO(booking.start_time), 'HH:mm')} -{' '}
                                {format(parseISO(booking.end_time), 'HH:mm')}
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
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}
