import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';

export interface OperatingHour {
  id: string;
  venue_id: string;
  day_of_week: number; // 0=Sunday ... 6=Saturday
  open_time: string;   // "HH:mm" or "HH:mm:ss"
  close_time: string;
  is_open: boolean;
  lunch_start: string | null;
  lunch_end: string | null;
}

const DAY_MAP: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

function timeToHour(t: string): number {
  const [h] = t.split(':').map(Number);
  return h;
}

export function useOperatingHours(venueId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['operating-hours', venueId];

  const { data: hours = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!venueId) return [];
      const { data, error } = await (supabase as any)
        .from('venue_operating_hours')
        .select('*')
        .eq('venue_id', venueId)
        .order('day_of_week');
      if (error) throw error;
      return (data || []) as OperatingHour[];
    },
    enabled: !!venueId,
  });

  const { minHour, maxHour } = useMemo(() => {
    if (hours.length === 0) return { minHour: 8, maxHour: 22 };
    const openDays = hours.filter((h) => h.is_open);
    if (openDays.length === 0) return { minHour: 8, maxHour: 22 };
    const min = Math.min(...openDays.map((h) => timeToHour(h.open_time)));
    const max = Math.max(...openDays.map((h) => timeToHour(h.close_time)));
    return { minHour: min, maxHour: max };
  }, [hours]);

  const saveMutation = useMutation({
    mutationFn: async (updatedHours: OperatingHour[]) => {
      if (!venueId) throw new Error('No venue');

      // 1. Upsert operating hours
      const rows = updatedHours.map((h) => ({
        id: h.id,
        venue_id: venueId,
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_open: h.is_open,
        lunch_start: h.lunch_start || null,
        lunch_end: h.lunch_end || null,
      }));

      const { error: upsertError } = await (supabase as any)
        .from('venue_operating_hours')
        .upsert(rows, { onConflict: 'venue_id,day_of_week' });

      if (upsertError) throw upsertError;

      // 2. Sync to public_page_sections.hours.schedule (atomic with the above via sequential calls)
      const schedule: Record<string, { open: string | null; close: string | null; closed: boolean; lunch_start?: string | null; lunch_end?: string | null }> = {};
      updatedHours.forEach((h) => {
        const dayName = DAY_MAP[h.day_of_week];
        schedule[dayName] = {
          open: h.is_open ? h.open_time.slice(0, 5) : null,
          close: h.is_open ? h.close_time.slice(0, 5) : null,
          closed: !h.is_open,
          lunch_start: h.is_open && h.lunch_start ? h.lunch_start.slice(0, 5) : null,
          lunch_end: h.is_open && h.lunch_end ? h.lunch_end.slice(0, 5) : null,
        };
      });

      // Fetch current public_page_sections to merge
      const { data: venue, error: fetchError } = await supabase
        .from('venues')
        .select('public_page_sections')
        .eq('id', venueId)
        .single();

      if (fetchError) throw fetchError;

      const currentSections = (venue?.public_page_sections as Record<string, unknown>) || {};
      const currentHours = (currentSections.hours as Record<string, unknown>) || {};

      const updatedSections = {
        ...currentSections,
        hours: {
          ...currentHours,
          schedule,
        },
      };

      const { error: updateError } = await supabase
        .from('venues')
        .update({ public_page_sections: updatedSections })
        .eq('id', venueId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Horários salvos com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar horários', description: error.message, variant: 'destructive' });
    },
  });

  return {
    hours,
    isLoading,
    minHour,
    maxHour,
    saveHours: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
