import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';

export interface CustomerPackage {
  id: string;
  venue_id: string;
  customer_id: string;
  service_id: string;
  total_sessions: number;
  used_sessions: number;
  status: 'active' | 'exhausted' | 'cancelled';
  expires_at: string | null;
  created_at: string;
  service_title?: string;
}

export function useCustomerPackages(customerId?: string) {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const venueId = currentVenue?.id;

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['customer-packages', customerId, venueId],
    queryFn: async () => {
      if (!customerId || !venueId) return [];
      const { data, error } = await supabase
        .from('customer_packages')
        .select('*, service:services(title)')
        .eq('customer_id', customerId)
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        service_title: p.service?.title || 'Serviço removido',
      })) as CustomerPackage[];
    },
    enabled: !!customerId && !!venueId,
  });

  const createPackage = useMutation({
    mutationFn: async (payload: {
      customer_id: string;
      service_id: string;
      total_sessions: number;
      expires_at?: string | null;
    }) => {
      if (!venueId) throw new Error('Venue não encontrado');
      const { error } = await supabase.from('customer_packages').insert({
        venue_id: venueId,
        customer_id: payload.customer_id,
        service_id: payload.service_id,
        total_sessions: payload.total_sessions,
        expires_at: payload.expires_at || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-packages'] });
      toast({ title: 'Pacote criado com sucesso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar pacote', description: err.message, variant: 'destructive' });
    },
  });

  const cancelPackage = useMutation({
    mutationFn: async (packageId: string) => {
      const { error } = await supabase
        .from('customer_packages')
        .update({ status: 'cancelled' })
        .eq('id', packageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-packages'] });
      toast({ title: 'Pacote cancelado' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao cancelar pacote', description: err.message, variant: 'destructive' });
    },
  });

  // Get active packages for specific service(s) — used by booking wizard
  const activePackages = packages.filter(p => p.status === 'active');

  return { packages, activePackages, isLoading, createPackage, cancelPackage };
}
