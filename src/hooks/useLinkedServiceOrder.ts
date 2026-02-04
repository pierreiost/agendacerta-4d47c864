import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Booking } from '@/hooks/useBookings';

interface ServiceOrderItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  service_code: string | null;
}

interface LinkedServiceOrder {
  id: string;
  order_number: number;
  order_type: 'simple' | 'complete';
  status_simple: string | null;
  status_complete: string | null;
  description: string;
  subtotal: number;
  discount: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  total: number;
  customer_name: string;
  created_at: string;
  items: ServiceOrderItem[];
}

export function useLinkedServiceOrder(booking: Booking | null) {
  // Extract service_order_id from booking metadata
  const metadata = booking?.metadata as Record<string, unknown> | null;
  const serviceOrderId = metadata?.service_order_id as string | undefined;

  const { data: serviceOrder, isLoading, error } = useQuery({
    queryKey: ['linked-service-order', serviceOrderId],
    queryFn: async () => {
      if (!serviceOrderId) return null;

      // Fetch service order with items
      const { data: order, error: orderError } = await supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          order_type,
          status_simple,
          status_complete,
          description,
          subtotal,
          discount,
          tax_rate,
          tax_amount,
          total,
          customer_name,
          created_at
        `)
        .eq('id', serviceOrderId)
        .single();

      if (orderError) {
        console.error('Error fetching service order:', orderError);
        return null;
      }

      // Fetch items
      const { data: items, error: itemsError } = await supabase
        .from('service_order_items')
        .select('id, description, quantity, unit_price, subtotal, service_code')
        .eq('service_order_id', serviceOrderId)
        .order('created_at');

      if (itemsError) {
        console.error('Error fetching service order items:', itemsError);
      }

      return {
        ...order,
        items: items || [],
      } as LinkedServiceOrder;
    },
    enabled: !!serviceOrderId,
  });

  return {
    serviceOrder,
    serviceOrderId,
    isLoading,
    error,
    hasLinkedOrder: !!serviceOrderId,
  };
}
