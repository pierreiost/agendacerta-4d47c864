import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

/**
 * Metadata types per venue segment
 */
export interface SportsMetadata {
  equipment_needed?: string[];
  court_preferences?: string;
  skill_level?: 'beginner' | 'intermediate' | 'advanced';
  players_count?: number;
}

export interface BeautyMetadata {
  hair_type?: string;
  skin_type?: string;
  allergies?: string[];
  preferred_products?: string[];
}

export interface HealthMetadata {
  medical_notes?: string;
  insurance_info?: string;
  previous_conditions?: string[];
}

export interface CustomMetadata {
  [key: string]: Json;
}

export type BookingMetadata = SportsMetadata | BeautyMetadata | HealthMetadata | CustomMetadata;

/**
 * Hook para leitura e escrita de campos dinâmicos no metadata JSONB
 */
export function useBookingMetadata() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * Extrai e tipifica metadata de uma booking
   */
  const parseMetadata = <T extends BookingMetadata>(
    rawMetadata: Json | null | undefined
  ): T => {
    if (!rawMetadata || typeof rawMetadata !== 'object' || Array.isArray(rawMetadata)) {
      return {} as T;
    }
    return rawMetadata as T;
  };

  /**
   * Obtém um campo específico do metadata
   */
  const getField = <T extends BookingMetadata, K extends keyof T>(
    metadata: Json | null | undefined,
    field: K
  ): T[K] | undefined => {
    const parsed = parseMetadata<T>(metadata);
    return parsed[field];
  };

  /**
   * Mescla novos campos ao metadata existente
   */
  const mergeMetadata = <T extends BookingMetadata>(
    existing: Json | null | undefined,
    updates: Partial<T>
  ): T => {
    const parsed = parseMetadata<T>(existing);
    return { ...parsed, ...updates };
  };

  /**
   * Mutation para atualizar metadata de uma booking
   */
  const updateMetadata = useMutation({
    mutationFn: async ({
      bookingId,
      updates,
      replace = false,
    }: {
      bookingId: string;
      updates: Partial<BookingMetadata>;
      replace?: boolean;
    }) => {
      // Se replace=true, substitui todo o metadata; senão, mescla com existente
      let newMetadata: Json;

      if (replace) {
        newMetadata = updates as Json;
      } else {
        // Busca metadata atual para merge
        const { data: current } = await supabase
          .from('bookings')
          .select('metadata')
          .eq('id', bookingId)
          .single();

        newMetadata = mergeMetadata(current?.metadata, updates) as Json;
      }

      const { data, error } = await supabase
        .from('bookings')
        .update({ metadata: newMetadata })
        .eq('id', bookingId)
        .select('id, metadata')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', currentVenue?.id] });
      queryClient.invalidateQueries({ queryKey: ['booking'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar metadata',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  /**
   * Remove um campo específico do metadata
   */
  const removeField = useMutation({
    mutationFn: async ({
      bookingId,
      field,
    }: {
      bookingId: string;
      field: string;
    }) => {
      const { data: current } = await supabase
        .from('bookings')
        .select('metadata')
        .eq('id', bookingId)
        .single();

      const parsed = parseMetadata<CustomMetadata>(current?.metadata);
      delete parsed[field];

      const { data, error } = await supabase
        .from('bookings')
        .update({ metadata: parsed as Json })
        .eq('id', bookingId)
        .select('id, metadata')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', currentVenue?.id] });
      queryClient.invalidateQueries({ queryKey: ['booking'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover campo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    // Helpers de leitura
    parseMetadata,
    getField,
    mergeMetadata,
    // Mutations
    updateMetadata,
    removeField,
  };
}
