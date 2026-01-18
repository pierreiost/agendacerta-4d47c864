import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';

export interface Customer {
  id: string;
  venue_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at'>;
export type CustomerUpdate = Partial<CustomerInsert> & { id: string };

export function useCustomers() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const customersQuery = useQuery({
    queryKey: ['customers', currentVenue?.id],
    queryFn: async () => {
      if (!currentVenue?.id) return [];

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('venue_id', currentVenue.id)
        .order('name');

      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!currentVenue?.id,
  });

  const createCustomer = useMutation({
    mutationFn: async (customer: Omit<CustomerInsert, 'venue_id'>) => {
      if (!currentVenue?.id) throw new Error('Venue not selected');

      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...customer,
          venue_id: currentVenue.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', currentVenue?.id] });
      toast({ title: 'Cliente criado com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar cliente', description: error.message, variant: 'destructive' });
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...updates }: CustomerUpdate) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', currentVenue?.id] });
      toast({ title: 'Cliente atualizado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar cliente', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', currentVenue?.id] });
      toast({ title: 'Cliente excluído!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir cliente', description: error.message, variant: 'destructive' });
    },
  });

  return {
    customers: customersQuery.data ?? [],
    isLoading: customersQuery.isLoading,
    error: customersQuery.error,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    refetch: customersQuery.refetch,
  };
}
