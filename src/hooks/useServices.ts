import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';
import type { Service, ServiceInsert, ServiceUpdate } from '@/types/services';

export function useServices() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const servicesQuery = useQuery({
    queryKey: ['services', currentVenue?.id],
    queryFn: async () => {
      if (!currentVenue?.id) return [];

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('venue_id', currentVenue.id)
        .order('display_order', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;
      return data as Service[];
    },
    enabled: !!currentVenue?.id,
  });

  const createService = useMutation({
    mutationFn: async (service: Omit<ServiceInsert, 'venue_id'>) => {
      if (!currentVenue?.id) throw new Error('Venue não selecionada');

      const { data, error } = await supabase
        .from('services')
        .insert({
          ...service,
          venue_id: currentVenue.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', currentVenue?.id] });
      toast({ title: 'Serviço criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar serviço',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, ...updates }: ServiceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', currentVenue?.id] });
      toast({ title: 'Serviço atualizado!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar serviço',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', currentVenue?.id] });
      toast({ title: 'Serviço excluído!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir serviço',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('services')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services', currentVenue?.id] });
      toast({
        title: variables.is_active ? 'Serviço ativado!' : 'Serviço desativado!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao alterar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    services: servicesQuery.data ?? [],
    activeServices: (servicesQuery.data ?? []).filter(s => s.is_active),
    isLoading: servicesQuery.isLoading,
    error: servicesQuery.error,
    createService,
    updateService,
    deleteService,
    toggleActive,
    refetch: servicesQuery.refetch,
  };
}
