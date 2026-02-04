import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { format, setHours, setMinutes, addMinutes, isBefore, isAfter } from 'date-fns';

interface TechnicianSlot {
  time: string; // ISO string
  label: string; // formatted HH:mm
}

interface TechnicianAvailability {
  technician_id: string;
  technician_name: string;
  available_slots: TechnicianSlot[];
}

/**
 * Hook to get technician availability for a specific date
 * Used by custom segment for OS/service scheduling
 */
export function useTechnicianAvailability(
  date: Date | null,
  durationMinutes: number,
  technicianIds?: string[]
) {
  const { currentVenue } = useVenue();
  const slotInterval = currentVenue?.slot_interval_minutes || 30;

  // React Query uses reference equality inside queryKey; arrays coming from form watchers
  // can be re-created on every render, causing endless refetch/re-render loops.
  // Convert to a stable, order-insensitive key.
  const technicianIdsKey = technicianIds?.length
    ? [...technicianIds].sort().join('|')
    : '';

  return useQuery({
    queryKey: ['technician-availability', currentVenue?.id, date?.toISOString(), durationMinutes, technicianIdsKey],
    queryFn: async () => {
      if (!currentVenue?.id || !date) return [];

      // Get bookable members (technicians)
      let membersQuery = supabase
        .from('venue_members')
        .select('id, display_name, user_id')
        .eq('venue_id', currentVenue.id)
        .eq('is_bookable', true);

       if (technicianIds && technicianIds.length > 0) {
         membersQuery = membersQuery.in('id', technicianIds);
      }

      const { data: members, error: membersError } = await membersQuery;
      if (membersError) throw membersError;

      // Get profiles for display names
      const memberIds = (members || []).map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', memberIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      // Get existing bookings for the date for all technicians
      const dateStr = format(date, 'yyyy-MM-dd');
      const startOfDayISO = `${dateStr}T00:00:00`;
      const endOfDayISO = `${dateStr}T23:59:59`;

      const memberIdsForBookings = (members || []).map(m => m.id);
      
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('professional_id, start_time, end_time')
        .eq('venue_id', currentVenue.id)
        .gte('start_time', startOfDayISO)
        .lte('start_time', endOfDayISO)
        .neq('status', 'CANCELLED')
        .in('professional_id', memberIdsForBookings);

      if (bookingsError) throw bookingsError;

      // Build availability for each technician
      const result: TechnicianAvailability[] = [];
      const workStart = 8; // 8:00
      const workEnd = 18; // 18:00

      for (const member of members || []) {
        const technicianBookings = (bookings || []).filter(b => b.professional_id === member.id);
        
        const slots: TechnicianSlot[] = [];
        let currentSlot = setMinutes(setHours(date, workStart), 0);
        const endOfWork = setMinutes(setHours(date, workEnd), 0);
        const now = new Date();

        while (isBefore(currentSlot, endOfWork)) {
          const slotEnd = addMinutes(currentSlot, durationMinutes);
          
          // Skip if slot end goes past work hours
          if (isAfter(slotEnd, endOfWork)) {
            currentSlot = addMinutes(currentSlot, slotInterval);
            continue;
          }

          // Skip past times
          if (isBefore(currentSlot, now)) {
            currentSlot = addMinutes(currentSlot, slotInterval);
            continue;
          }

          // Check for conflicts with existing bookings
          const hasConflict = technicianBookings.some(booking => {
            const bookingStart = new Date(booking.start_time);
            const bookingEnd = new Date(booking.end_time);
            return currentSlot < bookingEnd && slotEnd > bookingStart;
          });

          if (!hasConflict) {
            slots.push({
              time: currentSlot.toISOString(),
              label: format(currentSlot, 'HH:mm'),
            });
          }

          currentSlot = addMinutes(currentSlot, slotInterval);
        }

        const displayName = member.display_name || profileMap.get(member.user_id) || 'Técnico';

        result.push({
          technician_id: member.id,
          technician_name: displayName,
          available_slots: slots,
        });
      }

      return result;
    },
    enabled: !!currentVenue?.id && !!date && durationMinutes > 0,
  });
}
