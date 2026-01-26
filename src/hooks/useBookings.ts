import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSyncBooking } from '@/hooks/useGoogleCalendar';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { differenceInHours } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export type Booking = Tables<'bookings'> & {
  space?: Tables<'spaces'> | null;
};

// Error codes that indicate permission/auth issues
const AUTH_ERROR_CODES = ['PGRST301', 'PGRST302', '401', '403', '42501'];
const SESSION_EXPIRED_MESSAGES = ['JWT expired', 'session_expired', 'invalid token'];

interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

function isAuthError(error: SupabaseError | null): boolean {
  if (!error) return false;
  
  // Check error code
  if (error.code && AUTH_ERROR_CODES.includes(error.code)) {
    return true;
  }
  
  // Check error message for session/auth issues
  const errorMessage = error.message?.toLowerCase() || '';
  return SESSION_EXPIRED_MESSAGES.some(msg => errorMessage.includes(msg.toLowerCase()));
}

function isRLSError(error: SupabaseError | null): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const details = error.details?.toLowerCase() || '';
  
  return (
    message.includes('row-level security') ||
    message.includes('rls') ||
    details.includes('violates row-level security') ||
    error.code === '42501' // PostgreSQL insufficient privilege
  );
}

export function useBookings(startDate?: Date, endDate?: Date) {
  const { currentVenue } = useVenue();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { syncToCalendar } = useSyncBooking();
  const navigate = useNavigate();

  const handleAuthError = (error: SupabaseError) => {
    console.error('Auth/RLS error in useBookings:', error);
    
    if (isAuthError(error)) {
      toast({
        title: 'Sessão expirada',
        description: 'Sua sessão expirou. Por favor, faça login novamente.',
        variant: 'destructive',
      });
      // Sign out and redirect to login
      signOut().then(() => navigate('/auth'));
      return true;
    }
    
    if (isRLSError(error)) {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar estes dados. Verifique se ainda é membro deste local.',
        variant: 'destructive',
      });
      // Refresh venue context
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      return true;
    }
    
    return false;
  };

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
        // Handle auth/RLS errors specifically
        if (handleAuthError(error as SupabaseError)) {
          return [];
        }
        throw error;
      }
      
      return data as Booking[];
    },
    enabled: !!currentVenue?.id && !!user,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      const err = error as SupabaseError;
      if (isAuthError(err) || isRLSError(err)) {
        return false;
      }
      return failureCount < 3;
    },
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
      // Sync to Google Calendar
      if (data?.id) {
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
      toast({ title: 'Reserva atualizada!' });
      // Sync to Google Calendar
      if (data?.id) {
        syncToCalendar(data.id, 'update');
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
      // Sync deletion to Google Calendar first (before deleting)
      await syncToCalendar(id, 'delete');

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
    
    if (error) {
      handleAuthError(error as SupabaseError);
      throw error;
    }
    
    return data.length > 0;
  };

  return {
    bookings: bookingsQuery.data ?? [],
    isLoading: bookingsQuery.isLoading,
    error: bookingsQuery.error,
    isError: bookingsQuery.isError,
    createBooking,
    updateBooking,
    deleteBooking,
    checkConflict,
    refetch: bookingsQuery.refetch,
  };
}

export function useBooking(id: string | null) {
  const { currentVenue } = useVenue();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
        // Handle auth errors
        if (isAuthError(error as SupabaseError)) {
          toast({
            title: 'Sessão expirada',
            description: 'Sua sessão expirou. Por favor, faça login novamente.',
            variant: 'destructive',
          });
          signOut().then(() => navigate('/auth'));
          return null;
        }
        
        if (isRLSError(error as SupabaseError)) {
          toast({
            title: 'Acesso negado',
            description: 'Você não tem permissão para acessar esta reserva.',
            variant: 'destructive',
          });
          queryClient.invalidateQueries({ queryKey: ['venues'] });
          return null;
        }
        
        throw error;
      }
      
      return data as Booking | null;
    },
    enabled: !!id && !!currentVenue?.id && !!user,
    retry: (failureCount, error) => {
      const err = error as SupabaseError;
      if (isAuthError(err) || isRLSError(err)) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
