import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVenue } from "@/contexts/VenueContext";
import { useToast } from "@/hooks/use-toast";
import type { AppRole } from "@/hooks/usePermissions";

export interface TeamMember {
  id: string;
  user_id: string;
  venue_id: string;
  role: AppRole;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_bookable: boolean | null;
  created_at: string;
  profile: {
    full_name: string;
    phone: string | null;
  } | null;
}

export function useTeamMembers() {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: members = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["team-members", currentVenue?.id],
    queryFn: async () => {
      if (!currentVenue?.id) return [];

      const { data, error } = await supabase
        .from("venue_members")
        .select(`
          id,
          user_id,
          venue_id,
          role,
          display_name,
          avatar_url,
          bio,
          is_bookable,
          created_at
        `)
        .eq("venue_id", currentVenue.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return data.map((member) => ({
        ...member,
        profile: profileMap.get(member.user_id) || null,
      })) as TeamMember[];
    },
    enabled: !!currentVenue?.id,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from("venue_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", currentVenue?.id] });
      toast({ title: "Função atualizada com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar função",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("venue_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", currentVenue?.id] });
      toast({ title: "Membro removido com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover membro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    members,
    isLoading,
    refetch,
    updateRole: updateRoleMutation.mutate,
    isUpdatingRole: updateRoleMutation.isPending,
    removeMember: removeMemberMutation.mutate,
    isRemovingMember: removeMemberMutation.isPending,
  };
}
