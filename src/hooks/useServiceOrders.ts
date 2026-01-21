import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';

export interface ServiceOrder {
  id: string;
  venue_id: string;
  booking_id: string | null;
  customer_id: string | null;
  order_type: 'simple' | 'complete';
  status_simple: 'open' | 'finished' | 'invoiced' | null;
  status_complete: 'draft' | 'approved' | 'in_progress' | 'finished' | 'invoiced' | 'cancelled' | null;
  order_number: number;
  customer_name: string;
  customer_document: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_state: string | null;
  customer_zip_code: string | null;
  description: string;
  notes: string | null;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  issued_at: string | null;
  executed_at: string | null;
  finished_at: string | null;
  nfse_number: string | null;
  nfse_verification_code: string | null;
  nfse_issued_at: string | null;
  nfse_pdf_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: Record<string, unknown> | null;
  booking?: Record<string, unknown> | null;
  items?: ServiceOrderItem[];
}

export interface ServiceOrderItem {
  id: string;
  service_order_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  service_code: string | null;
  created_at: string;
}

export interface ServiceOrderInsert {
  venue_id: string;
  customer_name: string;
  description: string;
  booking_id?: string | null;
  customer_id?: string | null;
  order_type?: 'simple' | 'complete';
  status_simple?: 'open' | 'finished' | 'invoiced' | null;
  status_complete?: 'draft' | 'approved' | 'in_progress' | 'finished' | 'invoiced' | 'cancelled' | null;
  customer_document?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_city?: string | null;
  customer_state?: string | null;
  customer_zip_code?: string | null;
  notes?: string | null;
  discount?: number;
  tax_rate?: number;
}

export interface ServiceOrderUpdate extends Partial<ServiceOrderInsert> {
  id: string;
  finished_at?: string | null;
}

export interface ServiceOrderItemInsert {
  service_order_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  service_code?: string | null;
}

export function useServiceOrders() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['service-orders', currentVenue?.id],
    queryFn: async () => {
      if (!currentVenue?.id) return [];

      const { data, error } = await supabase
        .from('service_orders')
        .select('*, items:service_order_items(*)')
        .eq('venue_id', currentVenue.id)
        .order('order_number', { ascending: false });

      if (error) throw error;
      return data as unknown as ServiceOrder[];
    },
    enabled: !!currentVenue?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (order: ServiceOrderInsert) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('service_orders')
        .insert({ ...order, created_by: user?.id } as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders', currentVenue?.id] });
      toast({ title: 'OS criada com sucesso!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar OS',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: ServiceOrderUpdate) => {
      const { data, error } = await supabase
        .from('service_orders')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders', currentVenue?.id] });
      toast({ title: 'OS atualizada!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar OS',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders', currentVenue?.id] });
      toast({ title: 'OS excluída!' });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir OS',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: ServiceOrderItemInsert) => {
      const { data, error } = await supabase
        .from('service_order_items')
        .insert(item as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders', currentVenue?.id] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao adicionar item',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceOrderItemInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from('service_order_items')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders', currentVenue?.id] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar item',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('service_order_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders', currentVenue?.id] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover item',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const getOrderItems = async (orderId: string): Promise<ServiceOrderItem[]> => {
    const { data, error } = await supabase
      .from('service_order_items')
      .select('*')
      .eq('service_order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as unknown as ServiceOrderItem[];
  };

  return {
    orders: ordersQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    error: ordersQuery.error,
    createOrder: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateOrder: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteOrder: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    addItem: addItemMutation.mutateAsync,
    updateItem: updateItemMutation.mutateAsync,
    removeItem: removeItemMutation.mutateAsync,
    getOrderItems,
  };
}

export function useServiceOrder(id: string | null) {
  const { currentVenue } = useVenue();

  return useQuery({
    queryKey: ['service-order', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('service_orders')
        .select('*, items:service_order_items(*)')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as ServiceOrder | null;
    },
    enabled: !!id && !!currentVenue?.id,
  });
}
