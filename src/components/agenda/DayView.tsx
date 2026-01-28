import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getSpaceColor } from './AgendaSidebar';
import type { Tables } from '@/integrations/supabase/types';
import type { Booking } from '@/hooks/useBookings';
import {
  format,
  setHours,
  setMinutes,
  isSameDay,
  differenceInMinutes,
  isWithinInterval,
  addMinutes,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Clock, DollarSign, GripVertical } from 'lucide-react';

type Space = Tables<'spaces'> & {
  category?: Tables<'categories'> | null;
};

interface DayViewProps {
  date: Date;
  spaces: Space[];
  bookings: Booking[];
  allSpaces: Space[];
  onSlotClick: (spaceId: string, date: Date, hour: number) => void;
  onBookingClick: (booking: Booking) => void;
  onBookingMove?: (bookingId: string, spaceId: string, newStart: Date, newEnd: Date) => void;
  onBookingResize?: (bookingId: string, newStart: Date, newEnd: Date) => void;
}

// Horários visíveis na agenda (8:00 a 22:00) - mais espaço útil
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8:00 to 22:00
const HOUR_HEIGHT = 48; // pixels per hour (reduced for better visibility)
const SLOT_INCREMENT = 30; // minutes
const BUSINESS_HOURS_START = 8; // Scroll to 8:00 by default

/**
 * Arredonda minutos para o slot mais próximo (30 min)
 */
function snapMinutesToSlot(minutes: number): number {
  return Math.round(minutes / SLOT_INCREMENT) * SLOT_INCREMENT;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-warning-100 text-warning-700 border-warning-200',
  CONFIRMED: 'bg-success-100 text-success-700 border-success-200',
  FINALIZED: 'bg-primary-100 text-primary-700 border-primary-200',
  CANCELLED: 'bg-error-100 text-error-700 border-error-200',
};

// Cores de fundo do card baseadas no status
const STATUS_CARD_STYLES: Record<string, { bg: string; border: string }> = {
  PENDING: { bg: 'bg-warning-50', border: 'border-l-warning-500' },
  CONFIRMED: { bg: 'bg-success-50', border: 'border-l-success-500' },
  FINALIZED: { bg: 'bg-primary-50', border: 'border-l-primary-500' },
  CANCELLED: { bg: 'bg-error-50', border: 'border-l-error-500' },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  FINALIZED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

interface DragState {
  bookingId: string;
  type: 'move' | 'resize-top' | 'resize-bottom';
  initialY: number;
  initialStart: Date;
  initialEnd: Date;
  spaceId: string;
}

export function DayView({
  date,
  spaces,
  bookings,
  allSpaces,
  onSlotClick,
  onBookingClick,
  onBookingMove,
  onBookingResize,
}: DayViewProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    spaceId: string;
    start: Date;
    end: Date;
  } | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  const now = new Date();
  const isToday = isSameDay(date, now);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Scroll para horário comercial ou horário atual ao carregar
  useEffect(() => {
    if (hasScrolledRef.current) return;

    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    // Se for hoje e estiver dentro do horário comercial, scroll para hora atual
    // Caso contrário, scroll para início do expediente
    const targetHour = isToday && currentHour >= BUSINESS_HOURS_START && currentHour <= 22
      ? currentHour
      : BUSINESS_HOURS_START;

    const scrollPosition = (targetHour - 8) * HOUR_HEIGHT;

    // Pequeno delay para garantir que o DOM está renderizado
    setTimeout(() => {
      scrollContainer.scrollTop = Math.max(0, scrollPosition - 20);
      hasScrolledRef.current = true;
    }, 100);
  }, [isToday, currentHour]);

  // Reset scroll flag quando a data muda
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [date]);

  const dayBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const bookingDate = new Date(booking.start_time);
      return isSameDay(bookingDate, date);
    });
  }, [bookings, date]);

  const getBookingPosition = (booking: Booking) => {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const durationMinutes = endMinutes - startMinutes;

    const top = ((startMinutes - 8 * 60) / 60) * HOUR_HEIGHT;
    const height = (durationMinutes / 60) * HOUR_HEIGHT;

    return { top, height: Math.max(height, 24) };
  };

  const snapToGrid = (y: number) => {
    const minutes = Math.round((y / HOUR_HEIGHT) * 60);
    const snapped = Math.round(minutes / SLOT_INCREMENT) * SLOT_INCREMENT;
    return (snapped / 60) * HOUR_HEIGHT;
  };

  const yToTime = (y: number, baseDate: Date) => {
    const minutesFromStart = (y / HOUR_HEIGHT) * 60 + 8 * 60;
    const hours = Math.floor(minutesFromStart / 60);
    const minutes = Math.round((minutesFromStart % 60) / SLOT_INCREMENT) * SLOT_INCREMENT;
    return setMinutes(setHours(baseDate, hours), minutes);
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, booking: Booking, type: 'move' | 'resize-top' | 'resize-bottom') => {
      e.stopPropagation();
      e.preventDefault();

      setDragState({
        bookingId: booking.id,
        type,
        initialY: e.clientY,
        initialStart: new Date(booking.start_time),
        initialEnd: new Date(booking.end_time),
        spaceId: booking.space_id,
      });

      setDragPreview({
        spaceId: booking.space_id,
        start: new Date(booking.start_time),
        end: new Date(booking.end_time),
      });
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState) return;

      const deltaY = e.clientY - dragState.initialY;
      const snappedDelta = snapToGrid(deltaY) - snapToGrid(0);
      const minutesDelta = (snappedDelta / HOUR_HEIGHT) * 60;

      let newStart = dragState.initialStart;
      let newEnd = dragState.initialEnd;

      if (dragState.type === 'move') {
        newStart = addMinutes(dragState.initialStart, minutesDelta);
        newEnd = addMinutes(dragState.initialEnd, minutesDelta);
      } else if (dragState.type === 'resize-top') {
        newStart = addMinutes(dragState.initialStart, minutesDelta);
        if (differenceInMinutes(dragState.initialEnd, newStart) < 30) {
          newStart = addMinutes(dragState.initialEnd, -30);
        }
      } else if (dragState.type === 'resize-bottom') {
        newEnd = addMinutes(dragState.initialEnd, minutesDelta);
        if (differenceInMinutes(newEnd, dragState.initialStart) < 30) {
          newEnd = addMinutes(dragState.initialStart, 30);
        }
      }

      // Clamp to valid hours (visual: 8-22, but bookings can still be 6-23)
      const startHour = newStart.getHours();
      const endHour = newEnd.getHours();
      if (startHour < 8) return;
      if (endHour > 22 || (endHour === 22 && newEnd.getMinutes() > 0)) return;

      setDragPreview({
        spaceId: dragState.spaceId,
        start: newStart,
        end: newEnd,
      });
    },
    [dragState]
  );

  const handleMouseUp = useCallback(() => {
    if (dragState && dragPreview) {
      const hasChanged =
        dragPreview.start.getTime() !== dragState.initialStart.getTime() ||
        dragPreview.end.getTime() !== dragState.initialEnd.getTime();

      if (hasChanged) {
        if (dragState.type === 'move' && onBookingMove) {
          onBookingMove(dragState.bookingId, dragState.spaceId, dragPreview.start, dragPreview.end);
        } else if (onBookingResize) {
          onBookingResize(dragState.bookingId, dragPreview.start, dragPreview.end);
        }
      }
    }

    setDragState(null);
    setDragPreview(null);
  }, [dragState, dragPreview, onBookingMove, onBookingResize]);

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

  const handleSlotClick = (spaceId: string, hour: number, event?: React.MouseEvent) => {
    // Calcular minutos baseado na posição do clique dentro do slot
    let minutes = 0;
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickY = event.clientY - rect.top;
      const rawMinutes = (clickY / HOUR_HEIGHT) * 60;
      minutes = snapMinutesToSlot(rawMinutes);
    }

    // Arredondar hora para o slot mais próximo
    const finalHour = hour + Math.floor(minutes / 60);
    const finalMinutes = minutes % 60;

    // Criar data com hora arredondada
    const slotDate = setMinutes(setHours(date, finalHour), finalMinutes);
    onSlotClick(spaceId, slotDate, finalHour);
  };

  const isCurrentTimeSlot = (hour: number) => {
    return isToday && hour === currentHour;
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (spaces.length === 0) {
    return (
      <Card className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <p>Nenhum espaço selecionado</p>
          <p className="text-sm">Selecione espaços na barra lateral para visualizar a agenda</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex-1 overflow-hidden shadow-soft">
      <ScrollArea className="h-full" ref={scrollAreaRef}>
        <div className="min-w-[320px] md:min-w-[600px] lg:min-w-[800px]">
          {/* Header with space names */}
          <div className="sticky top-0 z-20 bg-card border-b border-border">
            <div className="flex">
              <div className="w-12 md:w-16 flex-shrink-0 border-r border-border p-1 md:p-2" />
              {spaces.map((space, index) => {
                const colors = getSpaceColor(allSpaces.findIndex((s) => s.id === space.id));
                return (
                  <div
                    key={space.id}
                    className={cn(
                      'flex-1 min-w-[100px] md:min-w-[140px] lg:min-w-[180px] p-2 md:p-3 border-r border-border last:border-r-0',
                      'bg-gradient-to-b from-muted/30 to-transparent'
                    )}
                  >
                    <div className="flex items-center gap-1 md:gap-2">
                      <div className={cn('w-2 h-2 md:w-3 md:h-3 rounded-full flex-shrink-0', colors.dot)} />
                      <span className="font-medium text-xs md:text-sm truncate">{space.name}</span>
                    </div>
                    {space.category && (
                      <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">{space.category.name}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time grid */}
          <div className="relative">
            {/* Current time indicator */}
            {isToday && currentHour >= 8 && currentHour <= 22 && (
              <div
                className="absolute left-0 right-0 z-30 pointer-events-none"
                style={{
                  top: ((currentHour - 8) * 60 + currentMinute) * (HOUR_HEIGHT / 60),
                }}
              >
                <div className="flex items-center">
                  <div className="w-16 flex justify-end pr-1">
                    <div className="w-2 h-2 rounded-full bg-error-500" />
                  </div>
                  <div className="flex-1 h-[2px] bg-error-500" />
                </div>
              </div>
            )}

            {HOURS.map((hour) => (
              <div key={hour} className="flex" style={{ height: HOUR_HEIGHT }}>
                {/* Time label */}
                <div className="w-12 md:w-16 flex-shrink-0 border-r border-border p-1 md:p-2 text-right flex items-start justify-end">
                  <span
                    className={cn(
                      'text-[10px] md:text-xs',
                      isCurrentTimeSlot(hour) ? 'text-destructive font-semibold' : 'text-muted-foreground'
                    )}
                  >
                    {format(setMinutes(setHours(date, hour), 0), 'HH:mm')}
                  </span>
                </div>

                {/* Space columns */}
                {spaces.map((space) => (
                  <div
                    key={`${space.id}-${hour}`}
                    className={cn(
                      'flex-1 min-w-[100px] md:min-w-[140px] lg:min-w-[180px] border-r border-b border-border last:border-r-0 relative cursor-pointer',
                      'transition-colors duration-150',
                      'hover:bg-primary/5',
                      isCurrentTimeSlot(hour) && 'bg-destructive/5'
                    )}
                    onClick={(e) => handleSlotClick(space.id, hour, e)}
                  />
                ))}
              </div>
            ))}

            {/* Bookings overlay */}
            {spaces.map((space) => {
              const spaceBookings = dayBookings.filter((b) => b.space_id === space.id);
              const spaceIndex = allSpaces.findIndex((s) => s.id === space.id);
              const colors = getSpaceColor(spaceIndex);
              const columnIndex = spaces.findIndex((s) => s.id === space.id);

              return spaceBookings.map((booking) => {
                const { top, height } = getBookingPosition(booking);
                const isDragging = dragState?.bookingId === booking.id;
                const previewPos =
                  isDragging && dragPreview
                    ? getBookingPosition({
                        ...booking,
                        start_time: dragPreview.start.toISOString(),
                        end_time: dragPreview.end.toISOString(),
                      })
                    : null;

                const isNow =
                  isToday &&
                  isWithinInterval(now, {
                    start: new Date(booking.start_time),
                    end: new Date(booking.end_time),
                  });

                // Usar cores baseadas no status
                const statusStyles = STATUS_CARD_STYLES[booking.status] || STATUS_CARD_STYLES.PENDING;

                return (
                  <div
                    key={booking.id}
                    className={cn(
                      'absolute rounded-md md:rounded-lg border-l-2 md:border-l-4 p-1 md:p-2 cursor-pointer',
                      'transition-all duration-200',
                      'hover:scale-[1.01] md:hover:scale-[1.02] hover:shadow-lg hover:z-20',
                      statusStyles.bg,
                      statusStyles.border,
                      isDragging && 'opacity-50',
                      isNow && 'animate-pulse-subtle ring-2 ring-primary/50'
                    )}
                    style={{
                      top: previewPos ? previewPos.top : top,
                      height: previewPos ? previewPos.height : height,
                      left: `calc(48px + ${columnIndex} * (100% - 48px) / ${spaces.length} + 1px)`,
                      width: `calc((100% - 48px) / ${spaces.length} - 2px)`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookingClick(booking);
                    }}
                  >
                    {/* Resize handles */}
                    {onBookingResize && (
                      <>
                        <div
                          className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-foreground/10 rounded-t-lg"
                          onMouseDown={(e) => handleMouseDown(e, booking, 'resize-top')}
                        />
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-foreground/10 rounded-b-lg"
                          onMouseDown={(e) => handleMouseDown(e, booking, 'resize-bottom')}
                        />
                      </>
                    )}

                    {/* Move handle */}
                    {onBookingMove && height >= 60 && (
                      <div
                        className="absolute top-1 right-1 p-1 cursor-move hover:bg-foreground/10 rounded"
                        onMouseDown={(e) => handleMouseDown(e, booking, 'move')}
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex flex-col h-full overflow-hidden">
                      <div className="flex items-center gap-1 text-foreground font-medium text-[10px] md:text-sm truncate">
                        <User className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0" />
                        <span className="truncate">{booking.customer_name || 'Cliente'}</span>
                      </div>

                      {height >= 32 && (
                        <div className="flex items-center gap-1 text-[9px] md:text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0 hidden sm:block" />
                          <span>
                            {format(new Date(booking.start_time), 'HH:mm')} -{' '}
                            {format(new Date(booking.end_time), 'HH:mm')}
                          </span>
                        </div>
                      )}

                      {height >= 44 && booking.grand_total && (
                        <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <DollarSign className="h-3 w-3 flex-shrink-0" />
                          <span>{formatCurrency(booking.grand_total)}</span>
                        </div>
                      )}

                      {height >= 56 && (
                        <div className="mt-auto pt-0.5 hidden sm:block">
                          <Badge
                            variant="outline"
                            className={cn('text-[8px] md:text-[10px] px-1 md:px-1.5 py-0', STATUS_STYLES[booking.status])}
                          >
                            {STATUS_LABELS[booking.status]}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}
