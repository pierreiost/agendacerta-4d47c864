import { useState, useMemo, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useBookings, type Booking } from '@/hooks/useBookings';
import { useSpaces } from '@/hooks/useSpaces';
import { useProfessionals } from '@/hooks/useProfessionals';
import { useVenue } from '@/contexts/VenueContext';
import { AgendaHeader, ViewMode } from '@/components/agenda/AgendaHeader';
import { AgendaSidebar } from '@/components/agenda/AgendaSidebar';
import { DayView, type AgendaColumn } from '@/components/agenda/DayView';
import { WeekViewNew } from '@/components/agenda/WeekViewNew';
import { MonthView } from '@/components/agenda/MonthView';
import { BookingWizard } from '@/components/agenda/BookingWizard';
import { BookingOrderSheet } from '@/components/bookings/BookingOrderSheet';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Loader2, Filter, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function Agenda() {
  const { currentVenue } = useVenue();
  const { spaces, isLoading: spacesLoading } = useSpaces();
  const { professionals, isLoading: professionalsLoading } = useProfessionals();
  const { toast } = useToast();

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [selectedProfessionalIds, setSelectedProfessionalIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['PENDING', 'CONFIRMED', 'FINALIZED']);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [defaultSlot, setDefaultSlot] = useState<{ spaceId?: string; professionalId?: string; date: Date; hour: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agendaMode, setAgendaMode] = useState<'spaces' | 'professionals'>('spaces');

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
      case 'week':
        return { start: startOfWeek(currentDate, { weekStartsOn: 0 }), end: endOfWeek(currentDate, { weekStartsOn: 0 }) };
      case 'month':
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
  }, [currentDate, viewMode]);

  const { bookings, isLoading: bookingsLoading, updateBooking, checkConflict } = useBookings(dateRange.start, dateRange.end);

  // Filter active spaces and professionals
  const activeSpaces = useMemo(() => {
    return spaces.filter((s) => s.is_active);
  }, [spaces]);

  const activeProfessionals = useMemo(() => {
    return professionals.filter((p) => p.is_active);
  }, [professionals]);

  // Auto-detect agenda mode based on what's available
  useMemo(() => {
    if (activeSpaces.length === 0 && activeProfessionals.length > 0) {
      setAgendaMode('professionals');
    } else if (activeSpaces.length > 0) {
      setAgendaMode('spaces');
    }
  }, [activeSpaces.length, activeProfessionals.length]);

  // Initialize selected items when data loads
  useMemo(() => {
    if (activeSpaces.length > 0 && selectedSpaceIds.length === 0) {
      setSelectedSpaceIds(activeSpaces.map((s) => s.id));
    }
    if (activeProfessionals.length > 0 && selectedProfessionalIds.length === 0) {
      setSelectedProfessionalIds(activeProfessionals.map((p) => p.id));
    }
  }, [activeSpaces, activeProfessionals]);

  // Filter spaces/professionals based on selection
  const filteredSpaces = useMemo(() => {
    if (selectedSpaceIds.length === 0) return activeSpaces;
    return activeSpaces.filter((s) => selectedSpaceIds.includes(s.id));
  }, [activeSpaces, selectedSpaceIds]);

  const filteredProfessionals = useMemo(() => {
    if (selectedProfessionalIds.length === 0) return activeProfessionals;
    return activeProfessionals.filter((p) => selectedProfessionalIds.includes(p.id));
  }, [activeProfessionals, selectedProfessionalIds]);

  // Convert professionals to AgendaColumn format for DayView
  const professionalsAsColumns: AgendaColumn[] = useMemo(() => {
    return filteredProfessionals.map(p => ({
      id: p.id,
      name: p.name,
      subtitle: p.specialties?.join(', ') || null
    }));
  }, [filteredProfessionals]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    let result = bookings;

    // Filter by selected spaces (if in spaces mode)
    if (agendaMode === 'spaces' && selectedSpaceIds.length > 0) {
      result = result.filter((b) => b.space_id && selectedSpaceIds.includes(b.space_id));
    }

    // Filter by selected professionals (if in professionals mode)
    if (agendaMode === 'professionals' && selectedProfessionalIds.length > 0) {
      result = result.filter((b) => b.professional_id && selectedProfessionalIds.includes(b.professional_id));
    }

    // Filter by status
    if (selectedStatuses.length > 0) {
      result = result.filter((b) => selectedStatuses.includes(b.status));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.customer_name?.toLowerCase().includes(query) ||
          b.customer_email?.toLowerCase().includes(query) ||
          b.customer_phone?.includes(query)
      );
    }

    return result;
  }, [bookings, agendaMode, selectedSpaceIds, selectedProfessionalIds, selectedStatuses, searchQuery]);

  // Handlers
  const handleSpaceToggle = useCallback((spaceId: string) => {
    setSelectedSpaceIds((prev) => {
      if (prev.includes(spaceId)) {
        return prev.filter((id) => id !== spaceId);
      }
      return [...prev, spaceId];
    });
  }, []);

  const handleProfessionalToggle = useCallback((professionalId: string) => {
    setSelectedProfessionalIds((prev) => {
      if (prev.includes(professionalId)) {
        return prev.filter((id) => id !== professionalId);
      }
      return [...prev, professionalId];
    });
  }, []);

  const handleStatusToggle = useCallback((status: string) => {
    setSelectedStatuses((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      }
      return [...prev, status];
    });
  }, []);

  const handleSlotClick = useCallback((columnId: string, date: Date, hour: number) => {
    if (agendaMode === 'spaces') {
      setDefaultSlot({ spaceId: columnId, date, hour });
    } else {
      setDefaultSlot({ professionalId: columnId, date, hour });
    }
    setWizardOpen(true);
  }, [agendaMode]);

  const handleBookingClick = useCallback((booking: Booking) => {
    setSelectedBooking(booking);
    setBookingSheetOpen(true);
  }, []);

  const handleNewBooking = useCallback(() => {
    setDefaultSlot(null);
    setWizardOpen(true);
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    setCurrentDate(date);
    setViewMode('day');
  }, []);

  const handleBookingMove = useCallback(
    async (bookingId: string, columnId: string, newStart: Date, newEnd: Date) => {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return;

      const spaceId = agendaMode === 'spaces' ? columnId : booking.space_id;
      const professionalId = agendaMode === 'professionals' ? columnId : booking.professional_id;

      const hasConflict = await checkConflict(newStart, newEnd, bookingId, spaceId, professionalId);
      if (hasConflict) {
        toast({
          title: 'Conflito de horário',
          description: 'Já existe uma reserva nesse horário.',
          variant: 'destructive',
        });
        return;
      }

      const space = spaces.find((s) => s.id === spaceId);
      updateBooking.mutate({
        id: bookingId,
        space_id: spaceId,
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        space_price_per_hour: space?.price_per_hour ?? 0,
      });
    },
    [bookings, spaces, agendaMode, checkConflict, updateBooking, toast]
  );

  const handleBookingResize = useCallback(
    async (bookingId: string, newStart: Date, newEnd: Date) => {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return;

      const hasConflict = await checkConflict(newStart, newEnd, bookingId, booking.space_id, booking.professional_id);
      if (hasConflict) {
        toast({
          title: 'Conflito de horário',
          description: 'Já existe uma reserva nesse horário.',
          variant: 'destructive',
        });
        return;
      }

      const space = spaces.find((s) => s.id === booking.space_id);
      updateBooking.mutate({
        id: bookingId,
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        space_price_per_hour: space?.price_per_hour ?? 0,
      });
    },
    [bookings, spaces, checkConflict, updateBooking, toast]
  );

  const isLoading = spacesLoading || professionalsLoading || bookingsLoading;
  const hasNoColumns = activeSpaces.length === 0 && activeProfessionals.length === 0;

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] -m-3 md:-m-6">
        {/* Header */}
        <div className="p-2 md:p-3 pb-0">
          <AgendaHeader
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onNewBooking={handleNewBooking}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex gap-2 md:gap-3 p-2 md:p-3 overflow-hidden">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <AgendaSidebar
              spaces={activeSpaces}
              bookings={bookings}
              selectedSpaceIds={selectedSpaceIds}
              onSpaceToggle={handleSpaceToggle}
              selectedStatuses={selectedStatuses}
              onStatusToggle={handleStatusToggle}
              currentDate={currentDate}
              onDateSelect={handleDayClick}
            />
          </div>

          {/* Mobile Sidebar Button */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden fixed bottom-16 md:bottom-20 left-3 md:left-4 z-40 h-10 w-10 md:h-12 md:w-12 rounded-full shadow-lg bg-background"
              >
                <Filter className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] sm:w-[320px]">
              <AgendaSidebar
                spaces={activeSpaces}
                bookings={bookings}
                selectedSpaceIds={selectedSpaceIds}
                onSpaceToggle={handleSpaceToggle}
                selectedStatuses={selectedStatuses}
                onStatusToggle={handleStatusToggle}
                currentDate={currentDate}
                onDateSelect={(date) => {
                  handleDayClick(date);
                  setSidebarOpen(false);
                }}
              />
            </SheetContent>
          </Sheet>

          {/* Calendar View */}
          {isLoading ? (
            <Card className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
            </Card>
          ) : hasNoColumns ? (
            <Card className="flex-1 flex flex-col items-center justify-center text-center p-4 md:p-8">
              <div className="rounded-full bg-muted p-3 md:p-4 mb-3 md:mb-4">
                <Users className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-base md:text-lg">Nenhum espaço ou profissional cadastrado</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Cadastre espaços ou profissionais para visualizar a agenda
              </p>
            </Card>
          ) : (
            <>
              {viewMode === 'day' && (
                <DayView
                  date={currentDate}
                  spaces={filteredSpaces}
                  bookings={filteredBookings}
                  allSpaces={activeSpaces}
                  onSlotClick={handleSlotClick}
                  onBookingClick={handleBookingClick}
                  onBookingMove={handleBookingMove}
                  onBookingResize={handleBookingResize}
                  mode={agendaMode}
                  professionals={professionalsAsColumns}
                />
              )}
              {viewMode === 'week' && (
                <WeekViewNew
                  date={currentDate}
                  spaces={filteredSpaces}
                  bookings={filteredBookings}
                  allSpaces={activeSpaces}
                  onSlotClick={handleSlotClick}
                  onBookingClick={handleBookingClick}
                />
              )}
              {viewMode === 'month' && (
                <MonthView
                  date={currentDate}
                  spaces={filteredSpaces}
                  bookings={filteredBookings}
                  allSpaces={activeSpaces}
                  onDayClick={handleDayClick}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Booking Wizard */}
      <BookingWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        spaces={filteredSpaces}
        allSpaces={activeSpaces}
        defaultSlot={defaultSlot}
      />

      {/* Booking Details Sheet */}
      <BookingOrderSheet
        open={bookingSheetOpen}
        onOpenChange={setBookingSheetOpen}
        booking={selectedBooking}
      />
    </AppLayout>
  );
}
