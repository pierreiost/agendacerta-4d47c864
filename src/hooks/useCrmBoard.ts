import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CrmColumn {
  id: string;
  name: string;
  position: number;
  color: string;
}

export interface CrmLead {
  id: string;
  venue_id: string | null;
  person_name: string;
  company_name: string;
  whatsapp: string | null;
  plan: string;
  segment: string;
  status_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCrmBoard() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: columns = [], isLoading: loadingColumns } = useQuery({
    queryKey: ['crm-columns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_crm_columns')
        .select('*')
        .order('position');
      if (error) throw error;
      return data as CrmColumn[];
    },
  });

  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ['crm-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_crm_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CrmLead[];
    },
  });

  const moveLeadMutation = useMutation({
    mutationFn: async ({ leadId, newStatusId }: { leadId: string; newStatusId: string }) => {
      const { error } = await supabase
        .from('saas_crm_leads')
        .update({ status_id: newStatusId, updated_at: new Date().toISOString() })
        .eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-leads'] }),
    onError: (e) => toast({ title: 'Erro ao mover lead', description: e.message, variant: 'destructive' }),
  });

  const addLeadMutation = useMutation({
    mutationFn: async (lead: Omit<CrmLead, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('saas_crm_leads').insert(lead);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      toast({ title: 'Lead adicionado!' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CrmLead> & { id: string }) => {
      const { error } = await supabase
        .from('saas_crm_leads')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      toast({ title: 'Lead atualizado!' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase.from('saas_crm_leads').delete().eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-leads'] });
      toast({ title: 'Lead removido' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return {
    columns,
    leads,
    loading: loadingColumns || loadingLeads,
    moveLead: moveLeadMutation.mutate,
    addLead: addLeadMutation.mutate,
    updateLead: updateLeadMutation.mutate,
    deleteLead: deleteLeadMutation.mutate,
    isAdding: addLeadMutation.isPending,
  };
}
