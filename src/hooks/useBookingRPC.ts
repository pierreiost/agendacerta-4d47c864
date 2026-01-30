import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';
import { useSyncBooking } from '@/hooks/useGoogleCalendar';

interface CreateBookingAtomicParams {
  venue_id: string;
  space_id: string;
  customer_name: string;
  start_time: string;
  end_time: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_id?: string | null;
  notes?: string | null;
  status?: string;
  space_price_per_hour?: number;
  booking_type?: string;
  professional_id?: string | null;
}

interface CreateRecurringBookingsParams {
  venue_id: string;
  space_id: string;
  customer_name: string;
  base_date: string; // YYYY-MM-DD format
  start_hour: number;
  end_hour: number;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_id?: string | null;
  notes?: string | null;
  space_price_per_hour?: number;
  recurrence_type?: 'weekly' | 'monthly';
  recurrence_count?: number;
}

interface RecurringBookingResult {
  booking_id: string | null;
  booking_date: string;
  success: boolean;
  error_message: string | null;
}

/**
 * Hook para criar reservas usando funções RPC atómicas
 * Elimina race conditions usando row-level locking no PostgreSQL
 */
export function useBookingRPC() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { syncToCalendar } = useSyncBooking();

  /**
   * Cria uma reserva única de forma atómica
   * - Verifica conflitos E cria a reserva na mesma transação
   * - Usa row-level locking para prevenir race conditions
   */
  const createBookingAtomic = useMutation({
    mutationFn: async (params: CreateBookingAtomicParams) => {
      const { data, error } = await supabase.rpc('create_booking_atomic', {
        p_venue_id: params.venue_id,
        p_space_id: params.space_id,
        p_customer_name: params.customer_name,
        p_start_time: params.start_time,
        p_end_time: params.end_time,
        p_customer_email: params.customer_email || null,
        p_customer_phone: params.customer_phone || null,
        p_customer_id: params.customer_id || null,
        p_notes: params.notes || null,
        p_status: params.status || 'CONFIRMED',
        p_space_price_per_hour: params.space_price_per_hour || 0,
        p_booking_type: params.booking_type || 'space',
        p_professional_id: params.professional_id || null,
      });

      if (error) {
        // Tratar erros específicos
        if (error.message?.includes('Conflito de horário')) {
          throw new Error('Este horário já está ocupado. Por favor, escolha outro.');
        }
        throw error;
      }

      return data as string; // Returns booking_id
    },
    onSuccess: (bookingId) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', currentVenue?.id] });
      toast({ title: 'Reserva criada com sucesso!' });
      
      // Sync to Google Calendar
      if (bookingId) {
        syncToCalendar(bookingId, 'create');
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar reserva',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  /**
   * Cria múltiplas reservas recorrentes em uma única transação
   * - Todas as reservas são criadas ou nenhuma (atomicidade)
   * - Retorna relatório detalhado de sucesso/falha por data
   */
  const createRecurringBookings = useMutation({
    mutationFn: async (params: CreateRecurringBookingsParams) => {
      const { data, error } = await supabase.rpc('create_recurring_bookings', {
        p_venue_id: params.venue_id,
        p_space_id: params.space_id,
        p_customer_name: params.customer_name,
        p_base_date: params.base_date,
        p_start_hour: params.start_hour,
        p_end_hour: params.end_hour,
        p_customer_email: params.customer_email || null,
        p_customer_phone: params.customer_phone || null,
        p_customer_id: params.customer_id || null,
        p_notes: params.notes || null,
        p_space_price_per_hour: params.space_price_per_hour || 0,
        p_recurrence_type: params.recurrence_type || 'weekly',
        p_recurrence_count: params.recurrence_count || 1,
      });

      if (error) throw error;

      return data as RecurringBookingResult[];
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', currentVenue?.id] });
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      if (successCount > 0 && failCount === 0) {
        toast({ title: `${successCount} reservas criadas com sucesso!` });
      } else if (successCount > 0 && failCount > 0) {
        toast({
          title: `${successCount} reservas criadas`,
          description: `${failCount} datas ignoradas (conflitos ou datas passadas)`,
        });
      } else {
        toast({
          title: 'Nenhuma reserva criada',
          description: 'Todas as datas têm conflitos ou são passadas',
          variant: 'destructive',
        });
      }

      // Sync successful bookings to Google Calendar
      results
        .filter(r => r.success && r.booking_id)
        .forEach(r => {
          syncToCalendar(r.booking_id!, 'create');
        });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar reservas recorrentes',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    createBookingAtomic,
    createRecurringBookings,
  };
}
