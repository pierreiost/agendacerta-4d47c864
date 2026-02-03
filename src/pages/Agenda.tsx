import { useState, useMemo, useCallback, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useBookings, type Booking } from '@/hooks/useBookings';
import { useSpaces } from '@/hooks/useSpaces';
import { useVenue } from '@/contexts/VenueContext';
import { AgendaHeader, ViewMode } from '@/components/agenda/AgendaHeader';
import { AgendaSidebar } from '@/components/agenda/AgendaSidebar';
import { SpaceFilterHeader } from '@/components/agenda/SpaceFilterHeader';
import { DayView } from '@/components/agenda/DayView';
import { WeekViewNew } from '@/components/agenda/WeekViewNew';
import { MonthView } from '@/components/agenda/MonthView';
import { BookingWizard } from '@/components/agenda/BookingWizard';
import { TechnicianBookingWizard } from '@/components/agenda/TechnicianBookingWizard';
import { ServiceBookingWizard } from '@/components/agenda/ServiceBookingWizard';
import { BookingOrderSheet } from '@/components/bookings/BookingOrderSheet';
import { DayViewSkeleton, WeekViewSkeleton, MonthViewSkeleton } from '@/components/agenda/AgendaSkeletons';
import { useModalPersist } from '@/hooks/useModalPersist';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Loader2, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Check booking mode based on venue segment
const getBookingMode = (segment?: string | null): 'space' | 'service' | 'technician' => {
  if (segment === 'beauty' || segment === 'health') return 'service';
  if (segment === 'custom') return 'technician';
  return 'space'; // sports or default
};

export default function Agenda() {
  const { currentVenue } = useVenue();
  const { spaces, isLoading: spacesLoading } = useSpaces();
  const { toast } = useToast();
  const { isReady, registerModal, setModalState, clearModal } = useModalPersist('agenda');

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [primarySpaceId, setPrimarySpaceId] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['CONFIRMED']);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [defaultSlot, setDefaultSlot] = useState<{ spaceId: string; date: Date; hour: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Restore modal state on mount
  useEffect(() => {
    if (isReady) {
      const wasWizardOpen = registerModal('bookingWizard', false);
      if (wasWizardOpen) {
        setWizardOpen(true);
        setDefaultSlot(null);
      }
    }
  }, [isReady, registerModal]);

  // Track wizard state changes
  useEffect(() => {
    if (isReady) {
      setModalState('bookingWizard', wizardOpen);
    }
  }, [wizardOpen, isReady, setModalState]);

  const handleWizardOpenChange = useCallback((open: boolean) => {
    setWizardOpen(open);
    if (!open) {
      setDefaultSlot(null);
      clearModal('bookingWizard');
    }
  }, [clearModal]);

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

  // Filter active spaces
  const activeSpaces = useMemo(() => {
    return spaces.filter((s) => s.is_active);
  }, [spaces]);

  // Initialize selected spaces and primary space when spaces load
  useEffect(() => {
    if (activeSpaces.length > 0 && selectedSpaceIds.length === 0) {
      setSelectedSpaceIds(activeSpaces.map((s) => s.id));
    }
    if (activeSpaces.length > 0 && !primarySpaceId) {
      setPrimarySpaceId(activeSpaces[0].id);
    }
  }, [activeSpaces, selectedSpaceIds.length, primarySpaceId]);

  // Filter spaces based on selection
  const filteredSpaces = useMemo(() => {
    if (selectedSpaceIds.length === 0) return activeSpaces;
    return activeSpaces.filter((s) => selectedSpaceIds.includes(s.id));
  }, [activeSpaces, selectedSpaceIds]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    let result = bookings;

    // Filter by selected spaces
    if (selectedSpaceIds.length > 0) {
      result = result.filter((b) => selectedSpaceIds.includes(b.space_id));
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
  }, [bookings, selectedSpaceIds, selectedStatuses, searchQuery]);

  // Handlers
  const handleSpaceToggle = useCallback((spaceId: string) => {
    setSelectedSpaceIds((prev) => {
      if (prev.includes(spaceId)) {
        return prev.filter((id) => id !== spaceId);
      }
      return [...prev, spaceId];
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

  const handleSlotClick = useCallback((spaceId: string, date: Date, hour: number) => {
    // Use the primary space if a slot click comes from the grid, otherwise use the clicked space
    const targetSpaceId = primarySpaceId || spaceId;
    setDefaultSlot({ spaceId: targetSpaceId, date, hour });
    setWizardOpen(true);
  }, [primarySpaceId]);

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
    async (bookingId: string, spaceId: string, newStart: Date, newEnd: Date) => {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return;

      const hasConflict = await checkConflict(spaceId, newStart, newEnd, bookingId);
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
    [bookings, spaces, checkConflict, updateBooking, toast]
  );

  const handleBookingResize = useCallback(
    async (bookingId: string, newStart: Date, newEnd: Date) => {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) return;

      const hasConflict = await checkConflict(booking.space_id, newStart, newEnd, bookingId);
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

  const isLoading = spacesLoading || bookingsLoading;

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] -m-3 md:-m-6">
        {/* Header */}
        <div className="p-2 md:p-3 pb-0 space-y-2">
          <AgendaHeader
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onNewBooking={handleNewBooking}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          
          {/* Space Filter Header - visible on all screens */}
          {activeSpaces.length > 0 && (
            <SpaceFilterHeader
              spaces={activeSpaces}
              primarySpaceId={primarySpaceId}
              onPrimarySpaceChange={setPrimarySpaceId}
              visibleSpaceIds={selectedSpaceIds}
              onSpaceVisibilityToggle={handleSpaceToggle}
            />
          )}
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
            <>
              {viewMode === 'day' && <DayViewSkeleton />}
              {viewMode === 'week' && <WeekViewSkeleton />}
              {viewMode === 'month' && <MonthViewSkeleton />}
            </>
          ) : activeSpaces.length === 0 ? (
            <Card className="flex-1 flex flex-col items-center justify-center text-center p-4 md:p-8">
              <div className="rounded-full bg-muted p-3 md:p-4 mb-3 md:mb-4">
                <Calendar className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-base md:text-lg">Nenhum espaço cadastrado</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Cadastre espaços para visualizar a agenda
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

      {/* Booking Wizard - Show different wizard based on venue segment */}
      {(() => {
        const mode = getBookingMode(currentVenue?.segment);
        if (mode === 'service') {
          return (
            <ServiceBookingWizard
              open={wizardOpen}
              onOpenChange={handleWizardOpenChange}
              defaultDate={defaultSlot?.date || currentDate}
            />
          );
        }
        if (mode === 'technician') {
          return (
            <TechnicianBookingWizard
              open={wizardOpen}
              onOpenChange={handleWizardOpenChange}
              defaultDate={defaultSlot?.date || currentDate}
            />
          );
        }
        return (
          <BookingWizard
            open={wizardOpen}
            onOpenChange={handleWizardOpenChange}
            spaces={filteredSpaces}
            allSpaces={activeSpaces}
            defaultSlot={defaultSlot}
          />
        );
      })()}

      {/* Booking Details Sheet */}
      <BookingOrderSheet
        open={bookingSheetOpen}
        onOpenChange={setBookingSheetOpen}
        booking={selectedBooking}
      />
    </AppLayout>
  );
}
