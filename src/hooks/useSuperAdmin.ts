import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SubscriptionStatus = 'trialing' | 'active' | 'overdue' | 'suspended';
export type VenueSegment = 'sports' | 'beauty' | 'health' | 'custom';
export type PlanType = 'basic' | 'max';

export interface VenueWithSubscription {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  status: SubscriptionStatus;
  subscription_status: string | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  segment: VenueSegment;
  business_category: string | null;
  plan_type: PlanType;
  cnpj_cpf: string | null;
  whatsapp: string | null;
  members: {
    user_id: string;
    role: string;
    profile?: {
      full_name: string;
      phone: string | null;
    };
  }[];
}

export function useSuperAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: isSuperAdmin, isLoading: checkingRole } = useQuery({
    queryKey: ['is-superadmin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase.rpc('is_superadmin', { _user_id: user.id });
      if (error) {
        console.error('Error checking superadmin:', error);
        return false;
      }
      return data;
    },
  });

  const { data: venues = [], isLoading: loadingVenues } = useQuery({
    queryKey: ['superadmin-venues'],
    queryFn: async () => {
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('*')
        .order('created_at', { ascending: false });

      if (venuesError) throw venuesError;

      // Fetch members for each venue
      const venuesWithMembers = await Promise.all(
        (venuesData || []).map(async (venue) => {
          const { data: members } = await supabase
            .from('venue_members')
            .select('user_id, role')
            .eq('venue_id', venue.id);

          // Fetch profiles for members
          const membersWithProfiles = await Promise.all(
            (members || []).map(async (member) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .eq('user_id', member.user_id)
                .maybeSingle();

              return {
                ...member,
                profile: profile || undefined,
              };
            })
          );

          // Map status from new enum or fallback to subscription_status
          const rawStatus = (venue as { status?: string }).status;
          const legacyStatus = venue.subscription_status;
          let status: SubscriptionStatus = 'trialing';
          
          if (rawStatus) {
            status = rawStatus as SubscriptionStatus;
          } else if (legacyStatus === 'trial') {
            status = 'trialing';
          } else if (legacyStatus === 'active') {
            status = 'active';
          } else if (legacyStatus === 'suspended' || legacyStatus === 'cancelled') {
            status = 'suspended';
          }

          return {
            id: venue.id,
            name: venue.name,
            email: venue.email,
            phone: venue.phone,
            address: venue.address,
            created_at: venue.created_at,
            status,
            subscription_status: venue.subscription_status,
            trial_ends_at: venue.trial_ends_at || null,
            subscription_ends_at: venue.subscription_ends_at || null,
            asaas_customer_id: venue.asaas_customer_id || null,
            asaas_subscription_id: venue.asaas_subscription_id || null,
            segment: ((venue as { segment?: string }).segment || 'sports') as VenueSegment,
            business_category: (venue as { business_category?: string }).business_category || null,
            plan_type: ((venue.plan_type as string) || 'basic') as PlanType,
            cnpj_cpf: (venue as { cnpj_cpf?: string }).cnpj_cpf || null,
            whatsapp: (venue as { whatsapp?: string }).whatsapp || null,
            members: membersWithProfiles,
          } as VenueWithSubscription;
        })
      );

      return venuesWithMembers;
    },
    enabled: isSuperAdmin === true,
    refetchOnWindowFocus: false,
  });

  const updateSubscriptionStatus = useMutation({
    mutationFn: async ({ venueId, status }: { venueId: string; status: SubscriptionStatus }) => {
      const updateData: Record<string, unknown> = { 
        status: status,
        subscription_status: status === 'trialing' ? 'trial' : status,
      };
      
      // If activating, set subscription_ends_at to 30 days from now
      if (status === 'active') {
        updateData.subscription_ends_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      const { error } = await supabase
        .from('venues')
        .update(updateData)
        .eq('id', venueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-venues'] });
      toast({
        title: 'Status atualizado',
        description: 'O status da assinatura foi atualizado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateVenueSegment = useMutation({
    mutationFn: async ({ venueId, segment, business_category }: { venueId: string; segment: VenueSegment; business_category?: string }) => {
      const { error } = await supabase
        .from('venues')
        .update({ 
          segment: segment,
          business_category: business_category || null,
        } as Record<string, unknown>)
        .eq('id', venueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-venues'] });
      toast({
        title: 'Segmento atualizado',
        description: 'O tipo de negócio foi alterado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateVenuePlan = useMutation({
    mutationFn: async ({ venueId, plan }: { venueId: string; plan: PlanType }) => {
      const { error } = await supabase
        .from('venues')
        .update({ plan_type: plan } as Record<string, unknown>)
        .eq('id', venueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-venues'] });
      toast({
        title: 'Plano atualizado',
        description: 'O plano foi alterado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateVenueExpiration = useMutation({
    mutationFn: async ({ venueId, trialEndsAt, subscriptionEndsAt }: { 
      venueId: string; 
      trialEndsAt: string | null; 
      subscriptionEndsAt: string | null;
    }) => {
      const { error } = await supabase
        .from('venues')
        .update({ 
          trial_ends_at: trialEndsAt,
          subscription_ends_at: subscriptionEndsAt,
        })
        .eq('id', venueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-venues'] });
      toast({
        title: 'Datas atualizadas',
        description: 'As datas de expiração foram atualizadas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Filter venues by status
  const activeVenues = venues.filter(v => v.status === 'active');
  const trialVenues = venues.filter(v => v.status === 'trialing');
  const overdueVenues = venues.filter(v => v.status === 'overdue');
  const suspendedVenues = venues.filter(v => v.status === 'suspended');

  // Check expired trials
  const expiredTrials = trialVenues.filter(v => {
    if (!v.trial_ends_at) return false;
    return new Date(v.trial_ends_at) < new Date();
  });

  return {
    isSuperAdmin,
    checkingRole,
    venues,
    loadingVenues,
    activeVenues,
    trialVenues,
    overdueVenues,
    suspendedVenues,
    expiredTrials,
    updateSubscriptionStatus,
    updateVenueSegment,
    updateVenuePlan,
    updateVenueExpiration,
  };
}
