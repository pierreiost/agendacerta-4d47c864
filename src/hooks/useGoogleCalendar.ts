import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useGoogleCalendar() {
  const { currentVenue } = useVenue();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const connectionQuery = useQuery({
    queryKey: ['google-calendar-connection', currentVenue?.id, user?.id],
    queryFn: async () => {
      if (!currentVenue?.id || !user?.id) return null;

      // First, try to find the user's own connection
      const { data: userConnection, error: userError } = await supabase
        .from('google_calendar_tokens')
        .select('venue_id, calendar_id, created_at, user_id')
        .eq('venue_id', currentVenue.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (userError) throw userError;
      
      if (userConnection) return userConnection;

      // Fallback: check for venue-wide connection (user_id is null) - only for admins
      const isAdmin = currentVenue.role === 'admin' || currentVenue.role === 'superadmin';
      if (isAdmin) {
        const { data: venueConnection, error: venueError } = await supabase
          .from('google_calendar_tokens')
          .select('venue_id, calendar_id, created_at, user_id')
          .eq('venue_id', currentVenue.id)
          .is('user_id', null)
          .maybeSingle();

        if (venueError) throw venueError;
        return venueConnection;
      }

      return null;
    },
    enabled: !!currentVenue?.id && !!user?.id,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!currentVenue?.id) throw new Error('Venue not selected');

      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { venue_id: currentVenue.id },
      });

      if (error) throw new Error(error.message || 'Failed to start OAuth');
      if (data?.error) throw new Error(data.error);

      return data.auth_url as string;
    },
    onSuccess: (authUrl) => {
      window.location.href = authUrl;
    },
    onError: (error) => {
      console.error('[GoogleCalendar] Connect error:', error);
      toast({
        title: 'Erro ao conectar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!currentVenue?.id) throw new Error('Venue not selected');

      const { data, error } = await supabase.functions.invoke('google-calendar-disconnect', {
        body: { venue_id: currentVenue.id },
      });

      if (error) throw new Error(error.message || 'Failed to disconnect');
      if (data?.error) throw new Error(data.error);

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-connection'] });
      toast({ title: 'Google Calendar desconectado!' });
    },
    onError: (error) => {
      console.error('[GoogleCalendar] Disconnect error:', error);
      toast({
        title: 'Erro ao desconectar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  return {
    isConnected: !!connectionQuery.data,
    connection: connectionQuery.data,
    isLoading: connectionQuery.isLoading,
    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
  };
}

// Hook to sync a booking with Google Calendar
export function useSyncBooking() {
  const { currentVenue } = useVenue();

  const syncToCalendar = async (bookingId: string, action: 'create' | 'update' | 'delete') => {
    if (!currentVenue?.id) {
      console.warn('[CalendarSync] No venue selected, skipping sync');
      return;
    }

    try {
      console.log(`[CalendarSync] Syncing booking ${bookingId} action=${action} venue=${currentVenue.id}`);
      
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: {
          action,
          booking_id: bookingId,
          venue_id: currentVenue.id,
        },
      });

      if (error) {
        console.error('[CalendarSync] Sync failed:', error.message);
        return;
      }

      if (data?.error) {
        console.error('[CalendarSync] Sync error from function:', data.error);
        return;
      }

      console.log('[CalendarSync] Sync result:', data);
    } catch (error) {
      console.error('[CalendarSync] Sync error:', error);
    }
  };

  return { syncToCalendar };
}
