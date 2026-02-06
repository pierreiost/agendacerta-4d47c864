import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { toast } from 'sonner';

export interface HealthRecord {
  id: string;
  venue_id: string;
  customer_id: string;
  recorded_at: string;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  blood_pressure: string | null;
  allergies: string | null;
  medications: string | null;
  chief_complaint: string | null;
  clinical_notes: string | null;
  blood_type: string | null;
  created_by: string | null;
  created_at: string;
}

export type HealthRecordInput = Omit<HealthRecord, 'id' | 'bmi' | 'created_at' | 'venue_id'>;

export function useHealthRecords(customerId: string | null | undefined) {
  const { currentVenue } = useVenue();
  const queryClient = useQueryClient();
  const queryKey = ['health-records', customerId];

  const { data: records = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!customerId || !currentVenue) return [];
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('customer_id', customerId)
        .eq('venue_id', currentVenue.id)
        .order('recorded_at', { ascending: false });
      if (error) throw error;
      return data as HealthRecord[];
    },
    enabled: !!customerId && !!currentVenue,
  });

  const createRecord = useMutation({
    mutationFn: async (input: Omit<HealthRecordInput, 'customer_id' | 'recorded_at' | 'created_by'> & { customer_id?: string }) => {
      if (!currentVenue || !customerId) throw new Error('Dados insuficientes');
      const { data, error } = await supabase
        .from('health_records')
        .insert({
          venue_id: currentVenue.id,
          customer_id: input.customer_id || customerId,
          weight_kg: input.weight_kg,
          height_cm: input.height_cm,
          blood_pressure: input.blood_pressure,
          allergies: input.allergies,
          medications: input.medications,
          chief_complaint: input.chief_complaint,
          clinical_notes: input.clinical_notes,
          blood_type: input.blood_type,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Registro salvo com sucesso');
    },
    onError: () => toast.error('Erro ao salvar registro'),
  });

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('health_records').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Registro removido');
    },
    onError: () => toast.error('Erro ao remover registro'),
  });

  // Get latest allergies and blood type from most recent record
  const latestAllergies = records.find(r => r.allergies)?.allergies || null;
  const latestBloodType = records.find(r => r.blood_type)?.blood_type || null;

  return { records, isLoading, createRecord, deleteRecord, latestAllergies, latestBloodType };
}
