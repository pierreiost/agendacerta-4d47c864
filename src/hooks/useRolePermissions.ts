import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVenue } from "@/contexts/VenueContext";
import { useToast } from "@/hooks/use-toast";
import type { AppRole, Module, Permission } from "@/hooks/usePermissions";
import { templateToPermissionArray, type TemplateKey } from "@/lib/permission-templates";

export interface RolePermission {
  id: string;
  venue_id: string;
  role: AppRole;
  module: Module;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export function useRolePermissions(role?: AppRole) {
  const { currentVenue } = useVenue();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: permissions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["role-permissions-edit", currentVenue?.id, role],
    queryFn: async () => {
      if (!currentVenue?.id || !role) return [];

      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("venue_id", currentVenue.id)
        .eq("role", role);

      if (error) throw error;
      return data as RolePermission[];
    },
    enabled: !!currentVenue?.id && !!role,
  });

  // Convert to map for easy access
  const permissionMap: Record<Module, Permission> = {} as Record<Module, Permission>;
  for (const perm of permissions) {
    permissionMap[perm.module as Module] = {
      canView: perm.can_view,
      canCreate: perm.can_create,
      canEdit: perm.can_edit,
      canDelete: perm.can_delete,
    };
  }

  const savePermissionsMutation = useMutation({
    mutationFn: async ({
      targetRole,
      permissionsToSave,
    }: {
      targetRole: AppRole;
      permissionsToSave: { module: Module; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[];
    }) => {
      if (!currentVenue?.id) throw new Error("Venue não selecionada");

      // Delete existing permissions for this role
      await supabase
        .from("role_permissions")
        .delete()
        .eq("venue_id", currentVenue.id)
        .eq("role", targetRole);

      // Insert new permissions
      const { error } = await supabase.from("role_permissions").insert(
        permissionsToSave.map((p) => ({
          venue_id: currentVenue.id,
          role: targetRole,
          module: p.module,
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        }))
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions-edit"] });
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      toast({ title: "Permissões salvas com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar permissões",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async ({
      targetRole,
      templateKey,
    }: {
      targetRole: AppRole;
      templateKey: TemplateKey;
    }) => {
      if (!currentVenue?.id) throw new Error("Venue não selecionada");

      const permissionsToSave = templateToPermissionArray(templateKey);

      // Delete existing permissions for this role
      await supabase
        .from("role_permissions")
        .delete()
        .eq("venue_id", currentVenue.id)
        .eq("role", targetRole);

      // Insert new permissions from template
      const { error } = await supabase.from("role_permissions").insert(
        permissionsToSave.map((p) => ({
          venue_id: currentVenue.id,
          role: targetRole,
          module: p.module,
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        }))
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions-edit"] });
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      toast({ title: "Template aplicado com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao aplicar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    permissions,
    permissionMap,
    isLoading,
    refetch,
    savePermissions: savePermissionsMutation.mutate,
    isSaving: savePermissionsMutation.isPending,
    applyTemplate: applyTemplateMutation.mutate,
    isApplyingTemplate: applyTemplateMutation.isPending,
  };
}
