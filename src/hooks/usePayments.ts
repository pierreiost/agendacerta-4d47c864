import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import type { Database } from '@/integrations/supabase/types';

export type Payment = Tables<'payments'>;
export type PaymentMethod = Database['public']['Enums']['payment_method'];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'CREDIT', label: 'Crédito' },
  { value: 'DEBIT', label: 'Débito' },
  { value: 'PIX', label: 'PIX' },
];

export function usePayments(bookingId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const paymentsQuery = useQuery({
    queryKey: ['payments', bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at');

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!bookingId,
  });

  const addPayment = useMutation({
    mutationFn: async (payment: TablesInsert<'payments'>) => {
      const { data, error } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', bookingId] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao registrar pagamento', description: error.message, variant: 'destructive' });
    },
  });

  const removePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', bookingId] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover pagamento', description: error.message, variant: 'destructive' });
    },
  });

  const finalizeBooking = useMutation({
    mutationFn: async ({ bookingId, payments }: { bookingId: string; payments: { amount: number; method: PaymentMethod }[] }) => {
      // Insert all payments
      for (const payment of payments) {
        const { error } = await supabase
          .from('payments')
          .insert({
            booking_id: bookingId,
            amount: payment.amount,
            method: payment.method,
          });

        if (error) throw error;
      }

      // Update booking status to FINALIZED
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'FINALIZED' })
        .eq('id', bookingId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Comanda fechada com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao fechar comanda', description: error.message, variant: 'destructive' });
    },
  });

  const paymentsTotal = paymentsQuery.data?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  return {
    payments: paymentsQuery.data ?? [],
    isLoading: paymentsQuery.isLoading,
    paymentsTotal,
    addPayment,
    removePayment,
    finalizeBooking,
  };
}
