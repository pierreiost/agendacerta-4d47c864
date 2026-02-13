import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSyncBooking } from '@/hooks/useGoogleCalendar';
import { useBookingErrors, SupabaseError } from '@/hooks/useBookingErrors';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { differenceInHours } from 'date-fns';

/**
 * Hook para mutações de reservas (create, update, delete)
 * Separado do hook de queries para melhor manutenção
 */
export function useBookingMutations() {
  const { currentVenue } = useVenue();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { syncToCalendar } = useSyncBooking();
  const { handleAuthError } = useBookingErrors();

  const createBooking = useMutation({
    mutationFn: async (booking: Omit<TablesInsert<'bookings'>, 'created_by' | 'space_total'> & { space_price_per_hour: number }) => {
      const { space_price_per_hour, ...bookingData } = booking;
      const hours = differenceInHours(new Date(booking.end_time), new Date(booking.start_time));
      const space_total = hours * space_price_per_hour;

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          ...bookingData,
          created_by: user?.id,
          space_total,
          grand_total: space_total,
          status: bookingData.status || 'CONFIRMED',
        })
        .select('*, space:spaces(*)')
        .single();

      if (error) {
        if (handleAuthError(error as SupabaseError)) {
          throw new Error('Sessão expirada');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', currentVenue?.id] });
      toast({ title: 'Reserva criada com sucesso!' });
      if (data?.id && data?.status === 'CONFIRMED') {
        syncToCalendar(data.id, 'create');
      }
    },
    onError: (error: Error) => {
      if (error.message !== 'Sessão expirada') {
        toast({ title: 'Erro ao criar reserva', description: error.message, variant: 'destructive' });
      }
    },
  });

  const updateBooking = useMutation({
    mutationFn: async ({ id, space_price_per_hour, ...updates }: TablesUpdate<'bookings'> & { id: string; space_price_per_hour?: number }) => {
      let updateData = { ...updates };

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

      if (error) {
        if (handleAuthError(error as SupabaseError)) {
          throw new Error('Sessão expirada');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', currentVenue?.id] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ['booking', data.id] });
      }
      toast({ title: 'Reserva atualizada!' });
      
      if (data?.id) {
        const newStatus = data.status;
        const hadEventBefore = !!data.google_event_id;
        
        if (newStatus === 'CONFIRMED') {
          syncToCalendar(data.id, hadEventBefore ? 'update' : 'create');
        } else if ((newStatus === 'CANCELLED' || newStatus === 'FINALIZED') && hadEventBefore) {
          syncToCalendar(data.id, 'delete');
        }
      }
    },
    onError: (error: Error) => {
      if (error.message !== 'Sessão expirada') {
        toast({ title: 'Erro ao atualizar reserva', description: error.message, variant: 'destructive' });
      }
    },
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const { data: bookingToDelete } = await supabase
        .from('bookings')
        .select('google_event_id')
        .eq('id', id)
        .single();
      
      if (bookingToDelete?.google_event_id) {
        await syncToCalendar(id, 'delete');
      }

      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

      if (error) {
        if (handleAuthError(error as SupabaseError)) {
          throw new Error('Sessão expirada');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', currentVenue?.id] });
      toast({ title: 'Reserva excluída!' });
    },
    onError: (error: Error) => {
      if (error.message !== 'Sessão expirada') {
        toast({ title: 'Erro ao excluir reserva', description: error.message, variant: 'destructive' });
      }
    },
  });

  return {
    createBooking,
    updateBooking,
    deleteBooking,
  };
}
