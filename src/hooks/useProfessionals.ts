import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVenue } from '@/contexts/VenueContext';
import { useToast } from '@/hooks/use-toast';
import type { BookableMember, ProfessionalAvailability } from '@/types/services';

export function useProfessionals() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const professionalsQuery = useQuery({
    queryKey: ['professionals', currentVenue?.id],
    queryFn: async () => {
      if (!currentVenue?.id) return [];

      // Fetch venue members with their profiles
      const { data: members, error: membersError } = await supabase
        .from('venue_members')
        .select('*')
        .eq('venue_id', currentVenue.id);

      if (membersError) throw membersError;

      // Fetch profiles for each member
      const membersWithProfiles = await Promise.all(
        (members || []).map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('user_id', member.user_id)
            .maybeSingle();

          // Fetch services assigned to this professional
          const { data: professionalServices } = await supabase
            .from('professional_services')
            .select('service_id')
            .eq('member_id', member.id);

          let services: { id: string; title: string }[] = [];
          if (professionalServices && professionalServices.length > 0) {
            const serviceIds = professionalServices.map(ps => ps.service_id);
            const { data: servicesData } = await supabase
              .from('services')
              .select('id, title')
              .in('id', serviceIds);
            services = servicesData || [];
          }

          return {
            ...member,
            profile: profile || undefined,
            services,
          } as BookableMember;
        })
      );

      return membersWithProfiles;
    },
    enabled: !!currentVenue?.id,
  });

  const bookableProfessionals = (professionalsQuery.data ?? []).filter(p => p.is_bookable);

  const updateProfessionalBookable = useMutation({
    mutationFn: async ({
      memberId,
      is_bookable,
      display_name,
      bio,
      serviceIds,
    }: {
      memberId: string;
      is_bookable: boolean;
      display_name?: string;
      bio?: string;
      serviceIds?: string[];
    }) => {
      // Update member bookable status
      const { error: memberError } = await supabase
        .from('venue_members')
        .update({
          is_bookable,
          display_name: display_name || null,
          bio: bio || null,
        })
        .eq('id', memberId);

      if (memberError) throw memberError;

      // Update professional services if provided
      if (serviceIds !== undefined) {
        // Remove existing assignments
        await supabase
          .from('professional_services')
          .delete()
          .eq('member_id', memberId);

        // Add new assignments
        if (serviceIds.length > 0) {
          const { error: servicesError } = await supabase
            .from('professional_services')
            .insert(
              serviceIds.map(serviceId => ({
                member_id: memberId,
                service_id: serviceId,
              }))
            );

          if (servicesError) throw servicesError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals', currentVenue?.id] });
      toast({ title: 'Profissional atualizado!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar profissional',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    professionals: professionalsQuery.data ?? [],
    bookableProfessionals,
    isLoading: professionalsQuery.isLoading,
    error: professionalsQuery.error,
    updateProfessionalBookable,
    refetch: professionalsQuery.refetch,
  };
}

export function useProfessionalAvailability(
  date: Date | null,
  serviceIds: string[],
  professionalId?: string
) {
  const { currentVenue } = useVenue();

  return useQuery({
    queryKey: ['professional-availability', currentVenue?.id, date?.toISOString(), serviceIds, professionalId],
    queryFn: async () => {
      if (!currentVenue?.id || !date || serviceIds.length === 0) return [];

      const { data, error } = await supabase.rpc('get_professional_availability', {
        p_venue_id: currentVenue.id,
        p_date: date.toISOString().split('T')[0],
        p_service_ids: serviceIds,
        p_professional_id: professionalId || null,
      });

      if (error) throw error;
      return (data || []) as ProfessionalAvailability[];
    },
    enabled: !!currentVenue?.id && !!date && serviceIds.length > 0,
  });
}
