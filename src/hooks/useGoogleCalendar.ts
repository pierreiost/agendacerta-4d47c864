import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';

export function useGoogleCalendar() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const connectionQuery = useQuery({
    queryKey: ['google-calendar-connection', currentVenue?.id],
    queryFn: async () => {
      if (!currentVenue?.id) return null;

      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('venue_id, calendar_id, created_at')
        .eq('venue_id', currentVenue.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!currentVenue?.id,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!currentVenue?.id) throw new Error('Venue not selected');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ venue_id: currentVenue.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start OAuth');
      }

      const { auth_url } = await response.json();
      return auth_url;
    },
    onSuccess: (authUrl) => {
      // Redirect to Google OAuth
      window.location.href = authUrl;
    },
    onError: (error) => {
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-disconnect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ venue_id: currentVenue.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect');
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-connection'] });
      toast({ title: 'Google Calendar desconectado!' });
    },
    onError: (error) => {
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
    if (!currentVenue?.id) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            booking_id: bookingId,
            venue_id: currentVenue.id,
          }),
        }
      );

      if (!response.ok) {
        console.error('Calendar sync failed:', await response.text());
      }
    } catch (error) {
      console.error('Calendar sync error:', error);
    }
  };

  return { syncToCalendar };
}
