import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';

export interface StockMovement {
  id: string;
  venue_id: string;
  product_id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  reason: string;
  quantity: number;
  unit_cost: number | null;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  balance_after: number;
  created_by: string | null;
  created_at: string;
}

interface CreateMovementParams {
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  reason: string;
  quantity: number;
  unitCost?: number;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
}

export function useStockMovements(productId?: string) {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['stock_movements', currentVenue?.id, productId],
    queryFn: async () => {
      if (!currentVenue?.id || !productId) return [];

      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('venue_id', currentVenue.id)
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as StockMovement[];
    },
    enabled: !!currentVenue?.id && !!productId,
  });

  const createMovement = useMutation({
    mutationFn: async (params: CreateMovementParams) => {
      if (!currentVenue?.id) throw new Error('Venue não encontrado');

      const { data, error } = await supabase.rpc('create_stock_movement', {
        p_venue_id: currentVenue.id,
        p_product_id: params.productId,
        p_type: params.type,
        p_reason: params.reason,
        p_quantity: params.quantity,
        p_unit_cost: params.unitCost ?? null,
        p_reference_id: params.referenceId ?? null,
        p_reference_type: params.referenceType ?? null,
        p_notes: params.notes ?? null,
        p_user_id: null,
      });

      if (error) throw error;
      return data as { id: string; balance_after: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', currentVenue?.id] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      toast({ title: 'Movimentação registrada!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro na movimentação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Batch stock deduction for sales
  const deductStockForSale = useMutation({
    mutationFn: async (items: { productId: string; quantity: number; bookingId: string }[]) => {
      if (!currentVenue?.id) throw new Error('Venue não encontrado');

      const results = [];
      for (const item of items) {
        const { data, error } = await supabase.rpc('create_stock_movement', {
          p_venue_id: currentVenue.id,
          p_product_id: item.productId,
          p_type: 'OUT',
          p_reason: 'sale',
          p_quantity: item.quantity,
          p_unit_cost: null,
          p_reference_id: item.bookingId,
          p_reference_type: 'booking',
          p_notes: 'Saída automática por venda',
          p_user_id: null,
        });
        if (error) throw error;
        results.push(data);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', currentVenue?.id] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao baixar estoque',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    movements: historyQuery.data ?? [],
    isLoading: historyQuery.isLoading,
    createMovement,
    deductStockForSale,
  };
}
