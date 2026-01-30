import type { Tables } from '@/integrations/supabase/types';
import { useBookingQueries, useBookingById } from '@/hooks/useBookingQueries';
import { useBookingMutations } from '@/hooks/useBookingMutations';
import { useBookingConflicts } from '@/hooks/useBookingConflicts';

// Re-export types for backwards compatibility
export type Booking = Tables<'bookings'> & {
  space?: Tables<'spaces'> | null;
};

/**
 * Hook principal para reservas - compõe hooks menores
 * Mantido para compatibilidade com código existente
 */
export function useBookings(startDate?: Date, endDate?: Date) {
  const queries = useBookingQueries(startDate, endDate);
  const mutations = useBookingMutations();
  const { checkConflict } = useBookingConflicts();

  return {
    ...queries,
    ...mutations,
    checkConflict,
  };
}

/**
 * Hook para buscar reserva por ID
 * @deprecated Use useBookingById from useBookingQueries instead
 */
export function useBooking(id: string | null) {
  return useBookingById(id);
}
