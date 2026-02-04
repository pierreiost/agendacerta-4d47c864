import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BookingServiceWithDetails {
  id: string;
  booking_id: string;
  service_id: string;
  professional_id: string | null;
  price: number;
  duration_minutes: number;
  created_at: string;
  service: {
    id: string;
    title: string;
    description: string | null;
  };
  professional: {
    id: string;
    display_name: string | null;
    profile: {
      full_name: string;
    } | null;
  } | null;
}

export function useBookingServices(bookingId: string | null) {
  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ['booking-services', bookingId],
    queryFn: async () => {
      if (!bookingId) return [];

      const { data, error } = await supabase
        .from('booking_services')
        .select(`
          id,
          booking_id,
          service_id,
          professional_id,
          price,
          duration_minutes,
          created_at,
          service:services(id, title, description),
          professional:venue_members(
            id,
            display_name,
            profile:profiles(full_name)
          )
        `)
        .eq('booking_id', bookingId)
        .order('created_at');

      if (error) {
        console.error('Error fetching booking services:', error);
        throw error;
      }

      // Transform the data to match our interface
      return (data || []).map((item) => ({
        ...item,
        service: Array.isArray(item.service) ? item.service[0] : item.service,
        professional: Array.isArray(item.professional) ? item.professional[0] : item.professional,
      })) as BookingServiceWithDetails[];
    },
    enabled: !!bookingId,
  });

  // Calculate total
  const servicesTotal = services.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);

  return {
    services,
    servicesTotal,
    totalDuration,
    isLoading,
    error,
  };
}
