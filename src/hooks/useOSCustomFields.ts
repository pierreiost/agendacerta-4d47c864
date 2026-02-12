import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';

export interface OSCustomField {
  id: string;
  venue_id: string;
  display_order: number;
  content: string;
  is_active: boolean;
  is_bold: boolean;
  created_at: string;
  updated_at: string;
}

export function useOSCustomFields() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const venueId = currentVenue?.id;

  const queryKey = ['os_custom_fields', venueId];

  const { data: fields = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!venueId) return [];
      const { data, error } = await supabase
        .from('os_custom_fields' as any)
        .select('*')
        .eq('venue_id', venueId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as OSCustomField[];
    },
    enabled: !!venueId,
  });

  const activeFields = fields.filter((f) => f.is_active);

  const upsertFields = useMutation({
    mutationFn: async (updatedFields: Omit<OSCustomField, 'created_at' | 'updated_at'>[]) => {
      if (!venueId) throw new Error('No venue');

      // Delete fields not in the updated list
      const existingIds = fields.map((f) => f.id);
      const updatedIds = updatedFields.filter((f) => f.id).map((f) => f.id);
      const toDelete = existingIds.filter((id) => !updatedIds.includes(id));

      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('os_custom_fields' as any)
          .delete()
          .in('id', toDelete);
        if (error) throw error;
      }

      // Upsert remaining fields
      for (const field of updatedFields) {
        if (field.id && existingIds.includes(field.id)) {
          // Update
          const { error } = await supabase
            .from('os_custom_fields' as any)
            .update({
              content: field.content,
              is_active: field.is_active,
              is_bold: field.is_bold,
              display_order: field.display_order,
            })
            .eq('id', field.id);
          if (error) throw error;
        } else {
          // Insert
          const { error } = await supabase
            .from('os_custom_fields' as any)
            .insert({
              venue_id: venueId,
              content: field.content,
              is_active: field.is_active,
              is_bold: field.is_bold,
              display_order: field.display_order,
            });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Campos personalizados salvos!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao salvar campos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    fields,
    activeFields,
    isLoading,
    upsertFields,
  };
}
