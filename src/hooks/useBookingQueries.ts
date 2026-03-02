import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBookingErrors, SupabaseError } from '@/hooks/useBookingErrors';
import type { Booking } from '@/hooks/useBookings';

/**
 * Hook para queries de reservas
 * Separado das mutações para melhor performance e manutenção
 */
export function useBookingQueries(startDate?: Date, endDate?: Date) {
  const { currentVenue } = useVenue();
  const { user } = useAuth();
  const { handleAuthError, shouldRetry } = useBookingErrors();

  const bookingsQuery = useQuery({
    queryKey: ['bookings', currentVenue?.id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!currentVenue?.id) return [];
      
      let query = supabase
        .from('bookings')
        .select('*, space:spaces(*)')
        .eq('venue_id', currentVenue.id)
        .order('start_time');

      if (startDate) {
        query = query.gte('start_time', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('end_time', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        if (handleAuthError(error as SupabaseError)) {
          return [];
        }
        throw error;
      }
      
      return data as Booking[];
    },
    enabled: !!currentVenue?.id && !!user,
    retry: shouldRetry,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  return {
    bookings: bookingsQuery.data ?? [],
    isLoading: bookingsQuery.isLoading,
    error: bookingsQuery.error,
    isError: bookingsQuery.isError,
    refetch: bookingsQuery.refetch,
  };
}

/**
 * Hook para buscar uma reserva específica por ID
 */
export function useBookingById(id: string | null) {
  const { currentVenue } = useVenue();
  const { user } = useAuth();
  const { handleAuthError, shouldRetry } = useBookingErrors();

  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*, space:spaces(*)')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (handleAuthError(error as SupabaseError)) {
          return null;
        }
        throw error;
      }
      
      return data as Booking | null;
    },
    enabled: !!id && !!currentVenue?.id && !!user,
    retry: shouldRetry,
  });
}
