import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SaasGlobalMetrics {
  totals: {
    total_venues: number;
    total_bookings: number;
    total_customers: number;
    total_service_orders: number;
    total_products: number;
    total_services: number;
  };
  per_venue: {
    venue_id: string;
    name: string;
    segment: string;
    bookings: number;
    customers: number;
    service_orders: number;
    products: number;
    services: number;
  }[];
  monthly_growth: {
    month: string;
    month_num: string;
    bookings: number;
    venues: number;
  }[];
}

export function useSaasMetrics() {
  return useQuery({
    queryKey: ['saas-global-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_saas_global_metrics');
      if (error) throw error;
      return data as unknown as SaasGlobalMetrics;
    },
  });
}
