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
  isBefore,
  isToday as isDateToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Clock, DollarSign, GripVertical, MapPin } from 'lucide-react';

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
  isServiceBased?: boolean;
}

// Horários visíveis na agenda (8:00 a 22:00)
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);
const HOUR_HEIGHT = 56;
const SLOT_INCREMENT = 30;
const BUSINESS_HOURS_START = 8;

function snapMinutesToSlot(minutes: number): number {
  return Math.round(minutes / SLOT_INCREMENT) * SLOT_INCREMENT;
}

// Cores de fundo do card baseadas no status
const STATUS_CARD_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  PENDING: { 
    bg: 'bg-amber-50 dark:bg-amber-950/50', 
    border: 'border-l-amber-500 dark:border-l-amber-400',
    text: 'text-amber-900 dark:text-amber-100'
  },
  CONFIRMED: { 
    bg: 'bg-emerald-50 dark:bg-emerald-950/50', 
    border: 'border-l-emerald-500 dark:border-l-emerald-400',
    text: 'text-emerald-900 dark:text-emerald-100'
  },
  FINALIZED: { 
    bg: 'bg-indigo-50 dark:bg-indigo-950/50', 
    border: 'border-l-indigo-500 dark:border-l-indigo-400',
    text: 'text-indigo-900 dark:text-indigo-100'
  },
  CANCELLED: { 
    bg: 'bg-red-50 dark:bg-red-950/50', 
    border: 'border-l-red-500 dark:border-l-red-400',
    text: 'text-red-900 dark:text-red-100'
  },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  FINALIZED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

// Função para calcular posições horizontais evitando sobreposição
function calculateBookingColumns(bookings: Booking[]): Map<string, { column: number; totalColumns: number }> {
  const result = new Map<string, { column: number; totalColumns: number }>();
  
  if (bookings.length === 0) return result;
  
  const sorted = [...bookings].sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  
  const groups: Booking[][] = [];
  let currentGroup: Booking[] = [];
  
  sorted.forEach((booking) => {
    const bookingStart = new Date(booking.start_time);
    const bookingEnd = new Date(booking.end_time);
    
    const overlapsWithGroup = currentGroup.some((b) => {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      return bookingStart < bEnd && bookingEnd > bStart;
    });
    
    if (currentGroup.length === 0 || overlapsWithGroup) {
      currentGroup.push(booking);
    } else {
      groups.push(currentGroup);
      currentGroup = [booking];
    }
  });
  
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  groups.forEach((group) => {
    const columns: Booking[][] = [];
    
    group.forEach((booking) => {
      const bookingStart = new Date(booking.start_time);
      
      let columnIndex = 0;
      while (true) {
        if (!columns[columnIndex]) {
          columns[columnIndex] = [];
        }
        
        const canFit = columns[columnIndex].every((b) => {
          const bEnd = new Date(b.end_time);
          return bookingStart >= bEnd;
        });
        
        if (canFit) {
          columns[columnIndex].push(booking);
          break;
        }
        columnIndex++;
      }
      
      result.set(booking.id, { column: columnIndex, totalColumns: 0 });
    });
    
    const totalColumns = columns.length;
    group.forEach((booking) => {
      const current = result.get(booking.id)!;
      result.set(booking.id, { ...current, totalColumns });
    });
  });
  
  return result;
}

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
  isServiceBased,
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

  useEffect(() => {
    if (hasScrolledRef.current) return;

    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const targetHour = isToday && currentHour >= BUSINESS_HOURS_START && currentHour <= 22
      ? currentHour
      : BUSINESS_HOURS_START;

    const scrollPosition = (targetHour - 8) * HOUR_HEIGHT;

    setTimeout(() => {
      scrollContainer.scrollTop = Math.max(0, scrollPosition - 20);
      hasScrolledRef.current = true;
    }, 100);
  }, [isToday, currentHour]);

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [date]);

  const dayBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const bookingDate = new Date(booking.start_time);
      return isSameDay(bookingDate, date);
    });
  }, [bookings, date]);

  // Calcular colunas para evitar sobreposição
  const bookingColumns = useMemo(() => {
    return calculateBookingColumns(dayBookings);
  }, [dayBookings]);

  const getBookingPosition = (booking: Booking) => {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const durationMinutes = endMinutes - startMinutes;

    const top = ((startMinutes - 8 * 60) / 60) * HOUR_HEIGHT;
    const height = (durationMinutes / 60) * HOUR_HEIGHT;

    return { top, height: Math.max(height, 28) };
  };

  const snapToGrid = (y: number) => {
    const minutes = Math.round((y / HOUR_HEIGHT) * 60);
    const snapped = Math.round(minutes / SLOT_INCREMENT) * SLOT_INCREMENT;
    return (snapped / 60) * HOUR_HEIGHT;
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

  const handleSlotClick = (hour: number, event?: React.MouseEvent) => {
    let minutes = 0;
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickY = event.clientY - rect.top;
      const rawMinutes = (clickY / HOUR_HEIGHT) * 60;
      minutes = snapMinutesToSlot(rawMinutes);
    }

    const finalHour = hour + Math.floor(minutes / 60);
    const finalMinutes = minutes % 60;
    const slotDate = setMinutes(setHours(date, finalHour), finalMinutes);
    
    // Bloquear horários passados
    if (isBefore(slotDate, new Date())) {
      return;
    }
    
    // Usar o primeiro espaço visível como padrão
    const primarySpaceId = spaces.length > 0 ? spaces[0].id : '';
    if (primarySpaceId) {
      onSlotClick(primarySpaceId, slotDate, finalHour);
    }
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

  // Só mostrar erro de espaços vazios para segmentos que precisam de espaços (sports)
  if (spaces.length === 0 && !isServiceBased) {
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
        <div className="min-w-[320px]">
          {/* Header com data */}
          <div className="sticky top-0 z-20 bg-card border-b border-border">
            <div className="flex items-center justify-center p-3 md:p-4">
              <div className={cn(
                'text-lg md:text-xl font-semibold capitalize',
                isToday && 'text-primary'
              )}>
                {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </div>
            </div>
          </div>

          {/* Grade de horários única */}
          <div className="relative">
            {/* Indicador de hora atual */}
            {isToday && currentHour >= 8 && currentHour <= 22 && (
              <div
                className="absolute left-0 right-0 z-30 pointer-events-none"
                style={{
                  top: ((currentHour - 8) * 60 + currentMinute) * (HOUR_HEIGHT / 60),
                }}
              >
                <div className="flex items-center">
                  <div className="w-14 md:w-16 flex justify-end pr-1">
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                  </div>
                  <div className="flex-1 h-[2px] bg-destructive" />
                </div>
              </div>
            )}

            {HOURS.map((hour) => {
              const slotDateTime = setMinutes(setHours(date, hour), 0);
              const isPastSlot = isBefore(addMinutes(slotDateTime, 59), new Date());
              
              return (
                <div key={hour} className="flex" style={{ height: HOUR_HEIGHT }}>
                  {/* Label da hora */}
                  <div className="w-14 md:w-16 flex-shrink-0 border-r border-border p-1 md:p-2 text-right flex items-start justify-end">
                    <span
                      className={cn(
                        'text-[10px] md:text-xs',
                        isCurrentTimeSlot(hour) ? 'text-destructive font-semibold' : 'text-muted-foreground'
                      )}
                    >
                      {format(slotDateTime, 'HH:mm')}
                    </span>
                  </div>

                  {/* Área clicável única */}
                  <div
                    className={cn(
                      'flex-1 border-b border-border relative transition-colors duration-150',
                      isPastSlot 
                        ? 'bg-muted/30 cursor-not-allowed' 
                        : 'cursor-pointer hover:bg-primary/5',
                      isCurrentTimeSlot(hour) && !isPastSlot && 'bg-destructive/5'
                    )}
                    onClick={(e) => !isPastSlot && handleSlotClick(hour, e)}
                  />
                </div>
              );
            })}

            {/* Reservas overlay */}
            {dayBookings.map((booking) => {
              const { top, height } = getBookingPosition(booking);
              const columnInfo = bookingColumns.get(booking.id) || { column: 0, totalColumns: 1 };
              const widthPercent = 100 / columnInfo.totalColumns;
              const leftPercent = columnInfo.column * widthPercent;
              
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

              const statusStyles = STATUS_CARD_STYLES[booking.status] || STATUS_CARD_STYLES.PENDING;
              const spaceIndex = allSpaces.findIndex((s) => s.id === booking.space_id);
              const spaceColors = getSpaceColor(spaceIndex);
              const space = allSpaces.find((s) => s.id === booking.space_id);

              return (
                <div
                  key={booking.id}
                  className={cn(
                    'absolute rounded-md md:rounded-lg border-l-4 p-1.5 md:p-2 cursor-pointer',
                    'transition-all duration-200',
                    'hover:scale-[1.01] hover:shadow-lg hover:z-20',
                    statusStyles.bg,
                    statusStyles.text,
                    isDragging && 'opacity-50',
                    isNow && 'animate-pulse-subtle ring-2 ring-primary/50'
                  )}
                  style={{
                    top: previewPos ? previewPos.top : top,
                    height: previewPos ? previewPos.height : height,
                    left: `calc(56px + ${leftPercent}% * (100% - 56px) / 100 + 4px)`,
                    width: `calc((100% - 56px - 8px) * ${widthPercent} / 100 - 4px)`,
                    borderLeftColor: undefined,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onBookingClick(booking);
                  }}
                >
                  {/* Borda colorida do espaço */}
                  <div 
                    className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-md', spaceColors.dot)}
                  />

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
                  <div className="flex flex-col h-full overflow-hidden pl-1">
                    <div className="flex items-center gap-1 text-foreground font-medium text-[10px] md:text-sm truncate">
                      <User className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0" />
                      <span className="truncate">{booking.customer_name || 'Cliente'}</span>
                    </div>

                    {/* Nome do espaço */}
                    <div className="flex items-center gap-0.5 text-[8px] md:text-[10px] text-muted-foreground mt-0.5">
                      <MapPin className="h-2 w-2 md:h-2.5 md:w-2.5 flex-shrink-0" />
                      <span className="truncate">{space?.name || 'Espaço'}</span>
                    </div>

                    {height >= 48 && (
                      <div className="flex items-center gap-1 text-[9px] md:text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0 hidden sm:block" />
                        <span>
                          {format(new Date(booking.start_time), 'HH:mm')} -{' '}
                          {format(new Date(booking.end_time), 'HH:mm')}
                        </span>
                      </div>
                    )}

                    {height >= 64 && booking.grand_total && (
                      <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <DollarSign className="h-3 w-3 flex-shrink-0" />
                        <span>{formatCurrency(booking.grand_total)}</span>
                      </div>
                    )}

                    {height >= 80 && (
                      <div className="mt-auto pt-0.5 hidden sm:block">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[8px] md:text-[10px] px-1 md:px-1.5 py-0 border',
                            booking.status === 'PENDING' && 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700',
                            booking.status === 'CONFIRMED' && 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700',
                            booking.status === 'FINALIZED' && 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-700',
                            booking.status === 'CANCELLED' && 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700'
                          )}
                        >
                          {STATUS_LABELS[booking.status]}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}
