import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type OrderItem = Tables<'order_items'> & {
  product?: Tables<'products'> | null;
};

export function useOrderItems(bookingId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const orderItemsQuery = useQuery({
    queryKey: ['order_items', bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      
      const { data, error } = await supabase
        .from('order_items')
        .select('*, product:products(*)')
        .eq('booking_id', bookingId)
        .order('created_at');

      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!bookingId,
  });

  const addOrderItem = useMutation({
    mutationFn: async (item: Omit<TablesInsert<'order_items'>, 'subtotal'>) => {
      const subtotal = item.unit_price * (item.quantity || 1);
      
      const { data, error } = await supabase
        .from('order_items')
        .insert({ ...item, subtotal })
        .select('*, product:products(*)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order_items', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Item adicionado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao adicionar item', description: error.message, variant: 'destructive' });
    },
  });

  const updateOrderItem = useMutation({
    mutationFn: async ({ id, quantity, unit_price }: { id: string; quantity: number; unit_price: number }) => {
      const subtotal = unit_price * quantity;
      
      const { data, error } = await supabase
        .from('order_items')
        .update({ quantity, unit_price, subtotal })
        .eq('id', id)
        .select('*, product:products(*)')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order_items', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Item atualizado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar item', description: error.message, variant: 'destructive' });
    },
  });

  const removeOrderItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order_items', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Item removido!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover item', description: error.message, variant: 'destructive' });
    },
  });

  const itemsTotal = orderItemsQuery.data?.reduce((sum, item) => sum + Number(item.subtotal), 0) ?? 0;

  return {
    orderItems: orderItemsQuery.data ?? [],
    isLoading: orderItemsQuery.isLoading,
    itemsTotal,
    addOrderItem,
    updateOrderItem,
    removeOrderItem,
  };
}
