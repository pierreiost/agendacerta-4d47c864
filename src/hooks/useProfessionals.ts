import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';

export interface Professional {
  id: string;
  venue_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  specialties: string[] | null;
  bio: string | null;
  is_active: boolean;
  work_schedule: Record<string, { start: string; end: string; enabled: boolean }> | null;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalInsert {
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  specialties?: string[] | null;
  bio?: string | null;
  is_active?: boolean;
  work_schedule?: Record<string, { start: string; end: string; enabled: boolean }> | null;
}

export interface ProfessionalUpdate extends Partial<ProfessionalInsert> {
  id: string;
}

export function useProfessionals() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const venueId = currentVenue?.id;

  const { data: professionals = [], isLoading, error } = useQuery({
    queryKey: ['professionals', venueId],
    queryFn: async () => {
      if (!venueId) return [];

      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('venue_id', venueId)
        .order('name');

      if (error) throw error;
      return data as Professional[];
    },
    enabled: !!venueId,
  });

  const createProfessional = useMutation({
    mutationFn: async (professional: ProfessionalInsert) => {
      if (!venueId) throw new Error('Venue não selecionado');

      const { data, error } = await supabase
        .from('professionals')
        .insert({ ...professional, venue_id: venueId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals', venueId] });
      toast({ title: 'Profissional criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar profissional', description: error.message, variant: 'destructive' });
    },
  });

  const updateProfessional = useMutation({
    mutationFn: async ({ id, ...updates }: ProfessionalUpdate) => {
      const { data, error } = await supabase
        .from('professionals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals', venueId] });
      toast({ title: 'Profissional atualizado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  const deleteProfessional = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('professionals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals', venueId] });
      toast({ title: 'Profissional removido!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });

  const activeProfessionals = professionals.filter(p => p.is_active);

  return {
    professionals,
    activeProfessionals,
    isLoading,
    error,
    createProfessional,
    updateProfessional,
    deleteProfessional,
  };
}
