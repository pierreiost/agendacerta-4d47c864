import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { format, addDays, isSameDay, isToday, parseISO, getHours, getMinutes, setHours, setMinutes, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Space } from '@/hooks/useSpaces';
import type { Booking } from '@/hooks/useBookings';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6:00 to 23:00
const HOUR_HEIGHT = 60; // pixels per hour
const MIN_DURATION_HOURS = 1;

interface WeekCalendarProps {
  spaces: Space[];
  bookings: Booking[];
  weekStart: Date;
  onSlotClick: (spaceId: string, date: Date, hour: number) => void;
  onBookingClick: (booking: Booking) => void;
  onBookingMove?: (bookingId: string, spaceId: string, newStart: Date, newEnd: Date) => void;
  onBookingResize?: (bookingId: string, newStart: Date, newEnd: Date) => void;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-500/90 hover:bg-amber-500 border-amber-600',
  CONFIRMED: 'bg-emerald-500/90 hover:bg-emerald-500 border-emerald-600',
  CANCELLED: 'bg-red-500/90 hover:bg-red-500 border-red-600',
  FINALIZED: 'bg-blue-500/90 hover:bg-blue-500 border-blue-600',
};

interface DragState {
  bookingId: string;
  type: 'move' | 'resize-top' | 'resize-bottom';
  startY: number;
  startX: number;
  originalTop: number;
  originalHeight: number;
  originalStartTime: Date;
  originalEndTime: Date;
  spaceId: string;
  dayIndex: number;
}

export function WeekCalendar({
  spaces,
  bookings,
  weekStart,
  onSlotClick,
  onBookingClick,
  onBookingMove,
  onBookingResize,
}: WeekCalendarProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<{ top: number; height: number; dayIndex: number; spaceId: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const snapToGrid = (pixelValue: number, gridSize: number = HOUR_HEIGHT / 2) => {
    return Math.round(pixelValue / gridSize) * gridSize;
  };

  const pixelsToTime = (pixels: number): { hours: number; minutes: number } => {
    const totalMinutes = (pixels / HOUR_HEIGHT) * 60;
    const hours = Math.floor(totalMinutes / 60) + 6;
    const minutes = Math.round((totalMinutes % 60) / 30) * 30;
    return { hours: Math.min(23, Math.max(6, hours)), minutes: minutes % 60 };
  };

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    booking: Booking,
    type: 'move' | 'resize-top' | 'resize-bottom',
    spaceId: string,
    dayIndex: number
  ) => {
    e.stopPropagation();
    e.preventDefault();

    if (booking.status === 'FINALIZED' || booking.status === 'CANCELLED') return;

    const { top, height } = getBookingPosition(booking);
    
    setDragState({
      bookingId: booking.id,
      type,
      startY: e.clientY,
      startX: e.clientX,
      originalTop: top,
      originalHeight: height,
      originalStartTime: parseISO(booking.start_time),
      originalEndTime: parseISO(booking.end_time),
      spaceId,
      dayIndex,
    });
    setDragPreview({ top, height, dayIndex, spaceId });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState) return;

    const deltaY = e.clientY - dragState.startY;
    let newTop = dragState.originalTop;
    let newHeight = dragState.originalHeight;
    let newDayIndex = dragState.dayIndex;

    if (dragState.type === 'move') {
      newTop = snapToGrid(dragState.originalTop + deltaY);
      
      // Clamp to valid range
      const maxTop = (HOURS.length - 1) * HOUR_HEIGHT - newHeight;
      newTop = Math.max(0, Math.min(maxTop, newTop));
    } else if (dragState.type === 'resize-top') {
      const proposedTop = snapToGrid(dragState.originalTop + deltaY);
      const maxTop = dragState.originalTop + dragState.originalHeight - MIN_DURATION_HOURS * HOUR_HEIGHT;
      newTop = Math.max(0, Math.min(maxTop, proposedTop));
      newHeight = dragState.originalHeight + (dragState.originalTop - newTop);
    } else if (dragState.type === 'resize-bottom') {
      const proposedHeight = snapToGrid(dragState.originalHeight + deltaY);
      const maxHeight = HOURS.length * HOUR_HEIGHT - dragState.originalTop;
      newHeight = Math.max(MIN_DURATION_HOURS * HOUR_HEIGHT, Math.min(maxHeight, proposedHeight));
    }

    setDragPreview({ top: newTop, height: newHeight, dayIndex: newDayIndex, spaceId: dragState.spaceId });
  }, [dragState]);

  const handleMouseUp = useCallback(() => {
    if (!dragState || !dragPreview) {
      setDragState(null);
      setDragPreview(null);
      return;
    }

    const { hours: startHours, minutes: startMinutes } = pixelsToTime(dragPreview.top);
    const { hours: endHours, minutes: endMinutes } = pixelsToTime(dragPreview.top + dragPreview.height);

    const baseDay = days[dragPreview.dayIndex];
    const newStart = setMinutes(setHours(baseDay, startHours), startMinutes);
    const newEnd = setMinutes(setHours(baseDay, endHours), endMinutes);

    // Check if anything actually changed
    const startChanged = differenceInMinutes(newStart, dragState.originalStartTime) !== 0;
    const endChanged = differenceInMinutes(newEnd, dragState.originalEndTime) !== 0;
    const spaceChanged = dragState.spaceId !== dragPreview.spaceId;

    if (dragState.type === 'move' && (startChanged || spaceChanged)) {
      onBookingMove?.(dragState.bookingId, dragPreview.spaceId, newStart, newEnd);
    } else if ((dragState.type === 'resize-top' || dragState.type === 'resize-bottom') && (startChanged || endChanged)) {
      onBookingResize?.(dragState.bookingId, newStart, newEnd);
    }

    setDragState(null);
    setDragPreview(null);
  }, [dragState, dragPreview, days, onBookingMove, onBookingResize]);

  // Attach global mouse listeners when dragging
  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  const isDragging = !!dragState;

  return (
    <Card className="overflow-hidden">
      <ScrollArea className="w-full">
        <div className="min-w-[900px]" ref={containerRef}>
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
                {days.map((day, dayIndex) => {
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

                      {/* Drag Preview */}
                      {dragPreview && dragPreview.spaceId === space.id && dragPreview.dayIndex === dayIndex && (
                        <div
                          className="absolute left-1 right-1 rounded-md bg-primary/30 border-2 border-dashed border-primary pointer-events-none z-20"
                          style={{
                            top: dragPreview.top + 1,
                            height: Math.max(dragPreview.height - 2, 24),
                          }}
                        />
                      )}

                      {/* Bookings */}
                      {dayBookings.map((booking) => {
                        const { top, height } = getBookingPosition(booking);
                        const statusClass = STATUS_COLORS[booking.status] || STATUS_COLORS.PENDING;
                        const isBeingDragged = dragState?.bookingId === booking.id;
                        const canDrag = booking.status !== 'FINALIZED' && booking.status !== 'CANCELLED';
                        
                        return (
                          <div
                            key={booking.id}
                            className={cn(
                              'absolute left-1 right-1 rounded-md px-2 py-1 border text-white shadow-sm transition-all overflow-hidden group',
                              statusClass,
                              isBeingDragged && 'opacity-50',
                              canDrag && 'cursor-grab active:cursor-grabbing'
                            )}
                            style={{
                              top: top + 1,
                              height: Math.max(height - 2, 24),
                              zIndex: isBeingDragged ? 10 : 5,
                            }}
                            onMouseDown={(e) => canDrag && handleMouseDown(e, booking, 'move', space.id, dayIndex)}
                            onClick={(e) => {
                              if (!isDragging) {
                                e.stopPropagation();
                                onBookingClick(booking);
                              }
                            }}
                          >
                            {/* Resize handle top */}
                            {canDrag && height > 40 && (
                              <div
                                className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/20 rounded-t-md"
                                onMouseDown={(e) => handleMouseDown(e, booking, 'resize-top', space.id, dayIndex)}
                              />
                            )}
                            
                            <div className="text-xs font-medium truncate">
                              {booking.customer_name}
                            </div>
                            {height > 40 && (
                              <div className="text-xs opacity-90 truncate">
                                {format(parseISO(booking.start_time), 'HH:mm')} -{' '}
                                {format(parseISO(booking.end_time), 'HH:mm')}
                              </div>
                            )}

                            {/* Resize handle bottom */}
                            {canDrag && height > 40 && (
                              <div
                                className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/20 rounded-b-md"
                                onMouseDown={(e) => handleMouseDown(e, booking, 'resize-bottom', space.id, dayIndex)}
                              />
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
