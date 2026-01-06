import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBookings, type Booking } from '@/hooks/useBookings';
import { useSpaces } from '@/hooks/useSpaces';
import { useVenue } from '@/contexts/VenueContext';
import { WeekCalendar } from '@/components/agenda/WeekCalendar';
import { BookingFormDialog } from '@/components/agenda/BookingFormDialog';
import { BookingOrderSheet } from '@/components/bookings/BookingOrderSheet';
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar, Loader2 } from 'lucide-react';

export default function Agenda() {
  const { currentVenue } = useVenue();
  const { spaces, isLoading: spacesLoading } = useSpaces();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('all');
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [defaultSlot, setDefaultSlot] = useState<{ spaceId: string; date: Date; hour: number } | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });

  const { bookings, isLoading: bookingsLoading } = useBookings(weekStart, weekEnd);

  const filteredSpaces = useMemo(() => {
    return spaces.filter(s => s.is_active);
  }, [spaces]);

  const displayedSpaces = useMemo(() => {
    if (selectedSpaceId === 'all') return filteredSpaces;
    return filteredSpaces.filter(s => s.id === selectedSpaceId);
  }, [filteredSpaces, selectedSpaceId]);

  const filteredBookings = useMemo(() => {
    if (selectedSpaceId === 'all') return bookings;
    return bookings.filter(b => b.space_id === selectedSpaceId);
  }, [bookings, selectedSpaceId]);

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleSlotClick = (spaceId: string, date: Date, hour: number) => {
    setDefaultSlot({ spaceId, date, hour });
    setSelectedBooking(null);
    setBookingDialogOpen(true);
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setBookingSheetOpen(true);
  };

  const handleNewBooking = () => {
    setDefaultSlot(null);
    setSelectedBooking(null);
    setBookingDialogOpen(true);
  };

  const isLoading = spacesLoading || bookingsLoading;

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie as reservas
            </p>
          </div>
          <Button onClick={handleNewBooking}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Reserva
          </Button>
        </div>

        {/* Toolbar */}
        <Card className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleToday}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="ml-2 font-medium">
                {format(weekStart, "d 'de' MMMM", { locale: ptBR })} -{' '}
                {format(weekEnd, "d 'de' MMMM, yyyy", { locale: ptBR })}
              </span>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por espaço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os espaços</SelectItem>
                  {filteredSpaces.map((space) => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Calendar */}
        {isLoading ? (
          <Card className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </Card>
        ) : displayedSpaces.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">Nenhum espaço cadastrado</h3>
            <p className="text-muted-foreground mt-1">
              Cadastre espaços para visualizar a agenda
            </p>
          </Card>
        ) : (
          <WeekCalendar
            spaces={displayedSpaces}
            bookings={filteredBookings}
            weekStart={weekStart}
            onSlotClick={handleSlotClick}
            onBookingClick={handleBookingClick}
          />
        )}
      </div>

      <BookingFormDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        booking={null}
        venueId={currentVenue?.id ?? ''}
        spaces={filteredSpaces}
        defaultSlot={defaultSlot}
      />

      <BookingOrderSheet
        open={bookingSheetOpen}
        onOpenChange={setBookingSheetOpen}
        booking={selectedBooking}
      />
    </AppLayout>
  );
}
