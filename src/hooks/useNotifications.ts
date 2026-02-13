import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useAuth } from '@/contexts/AuthContext';

export interface VenueNotification {
  id: string;
  venue_id: string;
  type: string;
  title: string;
  message: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { currentVenue } = useVenue();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const venueId = currentVenue?.id;

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['venue-notifications', venueId],
    queryFn: async () => {
      if (!venueId) return [];
      const { data, error } = await supabase
        .from('venue_notifications')
        .select('*')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as VenueNotification[];
    },
    enabled: !!venueId && !!user,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Realtime subscription
  useEffect(() => {
    if (!venueId || !user) return;

    const channel = supabase
      .channel(`venue-notifications-${venueId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'venue_notifications',
          filter: `venue_id=eq.${venueId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['venue-notifications', venueId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, user, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('venue_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-notifications', venueId] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!venueId) return;
      const { error } = await supabase
        .from('venue_notifications')
        .update({ is_read: true })
        .eq('venue_id', venueId)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-notifications', venueId] });
    },
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      if (!venueId) return;
      const { error } = await supabase
        .from('venue_notifications')
        .delete()
        .eq('venue_id', venueId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venue-notifications', venueId] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}
