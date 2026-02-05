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
  isWithinInterval,
  isBefore,
  setHours,
  setMinutes,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, MapPin } from 'lucide-react';

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

// Horários visíveis na agenda (8:00 a 22:00)
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);
const HOUR_HEIGHT = 48;

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

// Função para calcular posições horizontais evitando sobreposição
function calculateBookingColumns(bookings: Booking[]): Map<string, { column: number; totalColumns: number }> {
  const result = new Map<string, { column: number; totalColumns: number }>();
  
  if (bookings.length === 0) return result;
  
  // Ordenar por horário de início
  const sorted = [...bookings].sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
  
  // Encontrar grupos de reservas que se sobrepõem
  const groups: Booking[][] = [];
  let currentGroup: Booking[] = [];
  
  sorted.forEach((booking) => {
    const bookingStart = new Date(booking.start_time);
    const bookingEnd = new Date(booking.end_time);
    
    // Verificar se sobrepõe com algum booking do grupo atual
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
  
  // Atribuir colunas dentro de cada grupo
  groups.forEach((group) => {
    const columns: Booking[][] = [];
    
    group.forEach((booking) => {
      const bookingStart = new Date(booking.start_time);
      
      // Encontrar a primeira coluna onde não há sobreposição
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
    
    // Atualizar total de colunas para o grupo
    const totalColumns = columns.length;
    group.forEach((booking) => {
      const current = result.get(booking.id)!;
      result.set(booking.id, { ...current, totalColumns });
    });
  });
  
  return result;
}

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

  // Agrupar reservas por dia
  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    weekDays.forEach((day) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayBookings = bookings.filter((b) => 
        isSameDay(new Date(b.start_time), day)
      );
      map.set(dayKey, dayBookings);
    });
    return map;
  }, [bookings, weekDays]);

  // Calcular colunas para cada dia
  const columnsByDay = useMemo(() => {
    const map = new Map<string, Map<string, { column: number; totalColumns: number }>>();
    weekDays.forEach((day) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      const dayBookings = bookingsByDay.get(dayKey) || [];
      map.set(dayKey, calculateBookingColumns(dayBookings));
    });
    return map;
  }, [bookingsByDay, weekDays]);

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

  // Pegar o espaço primário para clique nos slots
  const primarySpaceId = spaces.length > 0 ? spaces[0].id : null;

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
        <div className="min-w-[600px] md:min-w-[800px]">
          {/* Header - Dias da semana */}
          <div className="sticky top-0 z-20 bg-card border-b border-border">
            <div className="flex">
              <div className="w-12 md:w-16 flex-shrink-0 border-r border-border" />
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'flex-1 p-2 md:p-3 text-center border-r border-border last:border-r-0',
                    isToday(day) && 'bg-primary/5'
                  )}
                >
                  <div className="text-[10px] md:text-xs text-muted-foreground uppercase">
                    {format(day, 'EEE', { locale: ptBR })}
                  </div>
                  <div
                    className={cn(
                      'text-sm md:text-lg font-semibold mt-0.5',
                      isToday(day) && 'text-primary'
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grade única de horários */}
          <div className="relative flex">
            {/* Coluna de horários */}
            <div className="w-12 md:w-16 flex-shrink-0 border-r border-border">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-border text-right pr-1 md:pr-2 text-[9px] md:text-xs text-muted-foreground flex items-start justify-end pt-1"
                  style={{ height: HOUR_HEIGHT }}
                >
                  {format(new Date().setHours(hour, 0), 'HH:mm')}
                </div>
              ))}
            </div>

            {/* Colunas dos dias */}
            {weekDays.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayBookings = bookingsByDay.get(dayKey) || [];
              const columns = columnsByDay.get(dayKey) || new Map();

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'flex-1 relative border-r border-border last:border-r-0',
                    isToday(day) && 'bg-primary/5'
                  )}
                >
                  {/* Slots de hora */}
                  {HOURS.map((hour) => {
                    const slotDateTime = setMinutes(setHours(day, hour), 0);
                    const isPast = isBefore(slotDateTime, now);
                    
                    return (
                      <div
                        key={hour}
                        className={cn(
                          'border-b border-border transition-colors',
                          isPast 
                            ? 'bg-muted/30 cursor-not-allowed' 
                            : 'hover:bg-muted/50 cursor-pointer'
                        )}
                        style={{ height: HOUR_HEIGHT }}
                        onClick={() => {
                          if (!isPast && primarySpaceId) {
                            onSlotClick(primarySpaceId, day, hour);
                          }
                        }}
                      />
                    );
                  })}

                  {/* Reservas do dia */}
                  {dayBookings.map((booking) => {
                    const { top, height } = getBookingPosition(booking);
                    const columnInfo = columns.get(booking.id) || { column: 0, totalColumns: 1 };
                    const widthPercent = 100 / columnInfo.totalColumns;
                    const leftPercent = columnInfo.column * widthPercent;
                    
                    const isNow =
                      isToday(day) &&
                      isWithinInterval(now, {
                        start: new Date(booking.start_time),
                        end: new Date(booking.end_time),
                      });

                    const statusStyles = STATUS_CARD_STYLES[booking.status] || STATUS_CARD_STYLES.PENDING;
                    
                    // Encontrar espaço da reserva para cor
                    const spaceIndex = allSpaces.findIndex((s) => s.id === booking.space_id);
                    const spaceColors = getSpaceColor(spaceIndex);
                    const space = allSpaces.find((s) => s.id === booking.space_id);

                    return (
                      <div
                        key={booking.id}
                        className={cn(
                          'absolute rounded border-l-2 md:border-l-4 p-0.5 md:p-1 cursor-pointer overflow-hidden',
                          'transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:z-10',
                          statusStyles.bg,
                          statusStyles.text,
                          isNow && 'ring-2 ring-primary/50'
                        )}
                        style={{ 
                          top, 
                          height,
                          left: `calc(${leftPercent}% + 2px)`,
                          width: `calc(${widthPercent}% - 4px)`,
                          borderLeftColor: `var(--space-color-${spaceIndex % 5})`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookingClick(booking);
                        }}
                      >
                        {/* Borda colorida baseada no espaço */}
                        <div 
                          className={cn('absolute left-0 top-0 bottom-0 w-1', spaceColors.dot)}
                          style={{ marginLeft: '-2px' }}
                        />
                        
                        <div className="flex items-center gap-0.5 text-[9px] md:text-xs font-medium truncate">
                          <User className="h-2.5 w-2.5 md:h-3 md:w-3 flex-shrink-0 hidden sm:block" />
                          <span className="truncate">
                            {booking.customer_name || 'Cliente'}
                          </span>
                        </div>
                        {/* Nome do espaço */}
                        <div className="flex items-center gap-0.5 text-[7px] md:text-[9px] text-muted-foreground">
                          <MapPin className="h-2 w-2 flex-shrink-0" />
                          <span className="truncate">{space?.name || 'Espaço'}</span>
                        </div>
                        {height >= 40 && (
                          <div className="text-[8px] md:text-[10px] text-muted-foreground hidden sm:block">
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
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}
