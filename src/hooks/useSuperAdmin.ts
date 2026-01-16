import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled';

export interface VenueWithSubscription {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
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

          return {
            id: venue.id,
            name: venue.name,
            email: venue.email,
            phone: venue.phone,
            address: venue.address,
            created_at: venue.created_at,
            subscription_status: (venue.subscription_status || 'trial') as SubscriptionStatus,
            trial_ends_at: venue.trial_ends_at || null,
            subscription_ends_at: venue.subscription_ends_at || null,
            asaas_customer_id: venue.asaas_customer_id || null,
            asaas_subscription_id: venue.asaas_subscription_id || null,
            members: membersWithProfiles,
          } as VenueWithSubscription;
        })
      );

      return venuesWithMembers;
    },
    enabled: isSuperAdmin === true,
  });

  const updateSubscriptionStatus = useMutation({
    mutationFn: async ({ venueId, status }: { venueId: string; status: SubscriptionStatus }) => {
      const updateData: Record<string, unknown> = { subscription_status: status };
      
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

  // Filter venues by status
  const activeVenues = venues.filter(v => v.subscription_status === 'active');
  const trialVenues = venues.filter(v => v.subscription_status === 'trial');
  const suspendedVenues = venues.filter(v => v.subscription_status === 'suspended');
  const cancelledVenues = venues.filter(v => v.subscription_status === 'cancelled');

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
    suspendedVenues,
    cancelledVenues,
    expiredTrials,
    updateSubscriptionStatus,
  };
}
