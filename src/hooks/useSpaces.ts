import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Space = Tables<'spaces'> & {
  category?: Tables<'categories'> | null;
};

export function useSpaces() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const spacesQuery = useQuery({
    queryKey: ['spaces', currentVenue?.id],
    queryFn: async () => {
      if (!currentVenue?.id) return [];
      
      const { data, error } = await supabase
        .from('spaces')
        .select('*, category:categories(*)')
        .eq('venue_id', currentVenue.id)
        .order('name');

      if (error) throw error;
      return data as Space[];
    },
    enabled: !!currentVenue?.id,
  });

  const createSpace = useMutation({
    mutationFn: async (space: TablesInsert<'spaces'>) => {
      const { data, error } = await supabase
        .from('spaces')
        .insert(space)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces', currentVenue?.id] });
      toast({ title: 'Espaço criado com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar espaço', description: error.message, variant: 'destructive' });
    },
  });

  const updateSpace = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'spaces'> & { id: string }) => {
      const { data, error } = await supabase
        .from('spaces')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces', currentVenue?.id] });
      toast({ title: 'Espaço atualizado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar espaço', description: error.message, variant: 'destructive' });
    },
  });

  const deleteSpace = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces', currentVenue?.id] });
      toast({ title: 'Espaço excluído!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir espaço', description: error.message, variant: 'destructive' });
    },
  });

  return {
    spaces: spacesQuery.data ?? [],
    isLoading: spacesQuery.isLoading,
    error: spacesQuery.error,
    createSpace,
    updateSpace,
    deleteSpace,
  };
}

export function useCategories() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['categories', currentVenue?.id],
    queryFn: async () => {
      if (!currentVenue?.id) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('venue_id', currentVenue.id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!currentVenue?.id,
  });

  const createCategory = useMutation({
    mutationFn: async (category: TablesInsert<'categories'>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', currentVenue?.id] });
      toast({ title: 'Categoria criada!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar categoria', description: error.message, variant: 'destructive' });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'categories'> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', currentVenue?.id] });
      toast({ title: 'Categoria atualizada!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar categoria', description: error.message, variant: 'destructive' });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', currentVenue?.id] });
      toast({ title: 'Categoria excluída!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir categoria', description: error.message, variant: 'destructive' });
    },
  });

  return {
    categories: categoriesQuery.data ?? [],
    isLoading: categoriesQuery.isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
