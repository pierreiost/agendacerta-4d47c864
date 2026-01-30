import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';

interface DashboardMetrics {
  total_today: number;
  confirmed_today: number;
  pending_today: number;
  month_revenue: number;
  month_bookings: number;
  occupancy_rate: number;
  revenue_sparkline: number[];
}

/**
 * Hook para obter métricas do dashboard calculadas no servidor
 * Performance otimizada: cálculos feitos no PostgreSQL, não no cliente
 */
export function useDashboardMetrics() {
  const { currentVenue } = useVenue();

  return useQuery({
    queryKey: ['dashboard-metrics', currentVenue?.id],
    queryFn: async (): Promise<DashboardMetrics | null> => {
      if (!currentVenue?.id) return null;

      const { data, error } = await supabase.rpc('get_dashboard_metrics', {
        p_venue_id: currentVenue.id,
      });

      if (error) {
        console.error('Error fetching dashboard metrics:', error);
        throw error;
      }

      // A função retorna um array com uma linha
      if (!data || data.length === 0) {
        return {
          total_today: 0,
          confirmed_today: 0,
          pending_today: 0,
          month_revenue: 0,
          month_bookings: 0,
          occupancy_rate: 0,
          revenue_sparkline: [0, 0, 0, 0, 0, 0, 0],
        };
      }

      const row = data[0];
      return {
        total_today: Number(row.total_today) || 0,
        confirmed_today: Number(row.confirmed_today) || 0,
        pending_today: Number(row.pending_today) || 0,
        month_revenue: Number(row.month_revenue) || 0,
        month_bookings: Number(row.month_bookings) || 0,
        occupancy_rate: Number(row.occupancy_rate) || 0,
        revenue_sparkline: row.revenue_sparkline || [0, 0, 0, 0, 0, 0, 0],
      };
    },
    enabled: !!currentVenue?.id,
    staleTime: 30000, // 30 segundos - métricas não mudam frequentemente
    refetchInterval: 60000, // Refetch a cada minuto
  });
}
