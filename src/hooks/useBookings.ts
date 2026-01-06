import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { differenceInHours } from 'date-fns';

export type Booking = Tables<'bookings'> & {
  space?: Tables<'spaces'> | null;
};

export function useBookings(startDate?: Date, endDate?: Date) {
  const { currentVenue } = useVenue();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!currentVenue?.id,
  });

  const createBooking = useMutation({
    mutationFn: async (booking: Omit<TablesInsert<'bookings'>, 'created_by' | 'space_total'> & { space_price_per_hour: number }) => {
      const { space_price_per_hour, ...bookingData } = booking;
      
      // Calculate space_total based on duration
      const hours = differenceInHours(new Date(booking.end_time), new Date(booking.start_time));
      const space_total = hours * space_price_per_hour;

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          ...bookingData,
          created_by: user?.id,
          space_total,
          grand_total: space_total,
        })
        .select('*, space:spaces(*)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', currentVenue?.id] });
      toast({ title: 'Reserva criada com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar reserva', description: error.message, variant: 'destructive' });
    },
  });

  const updateBooking = useMutation({
    mutationFn: async ({ id, space_price_per_hour, ...updates }: TablesUpdate<'bookings'> & { id: string; space_price_per_hour?: number }) => {
      let updateData = { ...updates };

      // Recalculate space_total if times changed
      if (updates.start_time && updates.end_time && space_price_per_hour) {
        const hours = differenceInHours(new Date(updates.end_time), new Date(updates.start_time));
        updateData.space_total = hours * space_price_per_hour;
      }

      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', id)
        .select('*, space:spaces(*)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', currentVenue?.id] });
      toast({ title: 'Reserva atualizada!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar reserva', description: error.message, variant: 'destructive' });
    },
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', currentVenue?.id] });
      toast({ title: 'Reserva excluída!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir reserva', description: error.message, variant: 'destructive' });
    },
  });

  const checkConflict = async (spaceId: string, startTime: Date, endTime: Date, excludeBookingId?: string) => {
    let query = supabase
      .from('bookings')
      .select('id')
      .eq('space_id', spaceId)
      .neq('status', 'CANCELLED')
      .or(`and(start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()})`);

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data.length > 0;
  };

  return {
    bookings: bookingsQuery.data ?? [],
    isLoading: bookingsQuery.isLoading,
    error: bookingsQuery.error,
    createBooking,
    updateBooking,
    deleteBooking,
    checkConflict,
    refetch: bookingsQuery.refetch,
  };
}

export function useBooking(id: string | null) {
  const { currentVenue } = useVenue();

  return useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*, space:spaces(*)')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Booking | null;
    },
    enabled: !!id && !!currentVenue?.id,
  });
}
