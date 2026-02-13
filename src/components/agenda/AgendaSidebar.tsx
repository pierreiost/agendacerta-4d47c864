import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import type { Booking } from '@/hooks/useBookings';
import { format, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Space = Tables<'spaces'> & {
  category?: Tables<'categories'> | null;
};

interface AgendaSidebarProps {
  spaces: Space[];
  bookings: Booking[];
  selectedSpaceIds: string[];
  onSpaceToggle: (spaceId: string) => void;
  selectedStatuses: string[];
  onStatusToggle: (status: string) => void;
  currentDate: Date;
  onDateSelect: (date: Date) => void;
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendente', color: 'bg-warning-100 text-warning-700 border-warning-200' },
  { value: 'CONFIRMED', label: 'Confirmado', color: 'bg-success-100 text-success-700 border-success-200' },
  { value: 'FINALIZED', label: 'Finalizado', color: 'bg-primary-100 text-primary-700 border-primary-200' },
  { value: 'CANCELLED', label: 'Cancelado', color: 'bg-error-100 text-error-700 border-error-200' },
];

const SPACE_COLORS = [
  { bg: 'bg-primary-100', border: 'border-l-primary-500', dot: 'bg-primary-500' },
  { bg: 'bg-success-100', border: 'border-l-success-500', dot: 'bg-success-500' },
  { bg: 'bg-warning-100', border: 'border-l-warning-500', dot: 'bg-warning-500' },
  { bg: 'bg-accent-100', border: 'border-l-accent-500', dot: 'bg-accent-500' },
  { bg: 'bg-error-100', border: 'border-l-error-500', dot: 'bg-error-500' },
];

export function getSpaceColor(index: number) {
  const safeIndex = index < 0 ? 0 : index % SPACE_COLORS.length;
  return SPACE_COLORS[safeIndex];
}

export function AgendaSidebar({
  spaces,
  bookings,
  selectedSpaceIds,
  onSpaceToggle,
  selectedStatuses,
  onStatusToggle,
  currentDate,
  onDateSelect,
}: AgendaSidebarProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const daysWithBookings = useMemo(() => {
    const days = new Set<string>();
    bookings.forEach((booking) => {
      const date = new Date(booking.start_time);
      days.add(format(date, 'yyyy-MM-dd'));
    });
    return days;
  }, [bookings]);

  return (
    <Card className="h-full w-full lg:w-[280px] flex-shrink-0 shadow-soft overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-3 md:p-4 space-y-4 md:space-y-6">
          {/* Mini Calendar */}
          <div className="overflow-hidden">
            <h3 className="text-xs md:text-sm font-semibold text-foreground mb-2 md:mb-3">Calendário</h3>
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => date && onDateSelect(date)}
              locale={ptBR}
              className="rounded-lg border p-1 pointer-events-auto w-full [&_table]:w-full [&_th]:w-8 [&_th]:text-xs [&_td]:w-8 [&_td]:h-8 [&_button]:w-8 [&_button]:h-8 [&_button]:text-xs"
              modifiers={{
                hasBooking: (date) => daysWithBookings.has(format(date, 'yyyy-MM-dd')),
              }}
              modifiersStyles={{
                hasBooking: {
                  fontWeight: 'bold',
                  backgroundColor: 'hsl(var(--primary) / 0.1)',
                },
              }}
            />
          </div>

          <Separator />

          {/* Status Filters */}
          <div>
            <h3 className="text-xs md:text-sm font-semibold text-foreground mb-2 md:mb-3">Status</h3>
            <div className="space-y-1 md:space-y-2">
              {STATUS_OPTIONS.map((status) => {
                const isChecked = selectedStatuses.includes(status.value);
                const statusCount = bookings.filter((b) => b.status === status.value).length;

                return (
                  <div
                    key={status.value}
                    className={cn(
                      'flex items-center gap-2 md:gap-3 p-1.5 md:p-2 rounded-lg transition-all duration-200 cursor-pointer hover:bg-muted/50',
                      isChecked && 'bg-muted/30'
                    )}
                    onClick={() => onStatusToggle(status.value)}
                  >
                    <Checkbox
                      id={`status-${status.value}`}
                      checked={isChecked}
                      onCheckedChange={() => onStatusToggle(status.value)}
                      className="pointer-events-none h-4 w-4"
                    />
                    <Badge variant="outline" className={cn('text-[10px] md:text-xs', status.color)}>
                      {status.label}
                    </Badge>
                    <span className="flex-1" />
                    {statusCount > 0 && (
                      <span className="text-[10px] md:text-xs text-muted-foreground">{statusCount}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Legend */}
          <div className="hidden md:block">
            <h3 className="text-xs md:text-sm font-semibold text-foreground mb-2 md:mb-3">Legenda</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary/10 border-l-4 border-l-primary" />
                <span>Reserva no espaço</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted animate-pulse" />
                <span>Agora / Próxima</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border-2 border-dashed border-muted-foreground/30" />
                <span>Slot disponível</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
}
