import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';

interface StatusDistribution {
  status: string;
  count: number;
}

interface ServiceOrderMetrics {
  open_orders: number;
  finished_today: number;
  month_revenue: number;
  revenue_sparkline: number[];
  status_distribution: StatusDistribution[];
}

/**
 * Hook para obter métricas de OS calculadas no servidor
 * Performance otimizada: cálculos feitos no PostgreSQL, não no cliente
 */
export function useServiceOrderMetrics(startDate?: Date, endDate?: Date) {
  const { currentVenue } = useVenue();

  return useQuery({
    queryKey: ['service-order-metrics', currentVenue?.id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<ServiceOrderMetrics | null> => {
      if (!currentVenue?.id) return null;

      const { data, error } = await supabase.rpc('get_service_order_metrics', {
        p_venue_id: currentVenue.id,
        p_start_date: startDate?.toISOString().split('T')[0] || null,
        p_end_date: endDate?.toISOString().split('T')[0] || null,
      });

      if (error) {
        console.error('Error fetching service order metrics:', error);
        throw error;
      }

      // A função retorna um array com uma linha
      if (!data || data.length === 0) {
        return {
          open_orders: 0,
          finished_today: 0,
          month_revenue: 0,
          revenue_sparkline: [0, 0, 0, 0, 0, 0, 0],
          status_distribution: [],
        };
      }

      const row = data[0];
      
      // Parse status_distribution from JSONB
      let parsedDistribution: StatusDistribution[] = [];
      if (row.status_distribution) {
        try {
          const dist = typeof row.status_distribution === 'string' 
            ? JSON.parse(row.status_distribution) 
            : row.status_distribution;
          parsedDistribution = Array.isArray(dist) ? dist : [];
        } catch {
          parsedDistribution = [];
        }
      }

      return {
        open_orders: Number(row.open_orders) || 0,
        finished_today: Number(row.finished_today) || 0,
        month_revenue: Number(row.month_revenue) || 0,
        revenue_sparkline: row.revenue_sparkline || [0, 0, 0, 0, 0, 0, 0],
        status_distribution: parsedDistribution,
      };
    },
    enabled: !!currentVenue?.id,
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000, // Refetch a cada minuto
  });
}
