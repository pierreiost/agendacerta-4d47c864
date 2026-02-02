import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVenue } from "@/contexts/VenueContext";
import { useAuth } from "@/contexts/AuthContext";

export type Module = 
  | "dashboard"
  | "agenda"
  | "clientes"
  | "espacos"
  | "servicos"
  | "produtos"
  | "ordens_servico"
  | "financeiro"
  | "relatorios"
  | "equipe"
  | "configuracoes"
  | "pagina_publica";

export type Action = "view" | "create" | "edit" | "delete";

export interface Permission {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export type AppRole = "admin" | "manager" | "staff" | "superadmin";

// Default permissions by role (fallback when no custom permissions exist)
const DEFAULT_PERMISSIONS: Record<AppRole, Record<Module, Permission>> = {
  superadmin: {
    dashboard: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    agenda: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    clientes: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    espacos: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    servicos: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    produtos: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    ordens_servico: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    financeiro: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    relatorios: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    equipe: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    configuracoes: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    pagina_publica: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  },
  admin: {
    dashboard: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    agenda: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    clientes: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    espacos: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    servicos: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    produtos: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    ordens_servico: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    financeiro: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    relatorios: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    equipe: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    configuracoes: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    pagina_publica: { canView: true, canCreate: true, canEdit: true, canDelete: true },
  },
  manager: {
    dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    agenda: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    clientes: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    espacos: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    servicos: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    produtos: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    ordens_servico: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    financeiro: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    relatorios: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    equipe: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    configuracoes: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    pagina_publica: { canView: true, canCreate: false, canEdit: false, canDelete: false },
  },
  staff: {
    dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    agenda: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    clientes: { canView: true, canCreate: true, canEdit: false, canDelete: false },
    espacos: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    servicos: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    produtos: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    ordens_servico: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    financeiro: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    relatorios: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    equipe: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    configuracoes: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    pagina_publica: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
};

export function usePermissions(module?: Module) {
  const { currentVenue } = useVenue();
  const { user } = useAuth();

  // Check if user is superadmin
  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-superadmin-permissions", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.rpc("is_superadmin", { _user_id: user.id });
      if (error) return false;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Get user's role in current venue
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ["user-venue-role", user?.id, currentVenue?.id],
    queryFn: async () => {
      if (!user || !currentVenue?.id) return null;

      // If superadmin, return superadmin role
      if (isSuperAdmin) return "superadmin" as AppRole;

      const { data, error } = await supabase
        .from("venue_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("venue_id", currentVenue.id)
        .single();

      if (error) return null;
      return data?.role as AppRole;
    },
    enabled: !!user && !!currentVenue?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get custom permissions for user's role
  const { data: customPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ["role-permissions", currentVenue?.id, userRole],
    queryFn: async () => {
      if (!currentVenue?.id || !userRole || userRole === "superadmin" || userRole === "admin") {
        return null;
      }

      const { data, error } = await supabase
        .from("role_permissions")
        .select("module, can_view, can_create, can_edit, can_delete")
        .eq("venue_id", currentVenue.id)
        .eq("role", userRole);

      if (error) return null;

      // Convert to a map
      const permissionMap: Partial<Record<Module, Permission>> = {};
      for (const perm of data || []) {
        permissionMap[perm.module as Module] = {
          canView: perm.can_view,
          canCreate: perm.can_create,
          canEdit: perm.can_edit,
          canDelete: perm.can_delete,
        };
      }
      return permissionMap;
    },
    enabled: !!currentVenue?.id && !!userRole && userRole !== "superadmin" && userRole !== "admin",
  });

  const isLoading = roleLoading || permissionsLoading;
  const role = userRole || "staff";

  // Get permission for a specific module
  const getPermission = (mod: Module): Permission => {
    // Superadmin and admin always have full access
    if (role === "superadmin" || role === "admin") {
      return DEFAULT_PERMISSIONS[role][mod];
    }

    // Check custom permissions first, then fall back to defaults
    if (customPermissions?.[mod]) {
      return customPermissions[mod];
    }

    return DEFAULT_PERMISSIONS[role]?.[mod] || {
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
    };
  };

  // If module is specified, return permission for that module
  const permission = module ? getPermission(module) : null;

  return {
    role,
    isLoading,
    isSuperAdmin: isSuperAdmin || false,
    isAdmin: role === "admin",
    isManager: role === "manager",
    isStaff: role === "staff",
    
    // Permission for specific module (if provided)
    canView: permission?.canView ?? false,
    canCreate: permission?.canCreate ?? false,
    canEdit: permission?.canEdit ?? false,
    canDelete: permission?.canDelete ?? false,
    
    // Function to check permission for any module
    getPermission,
    
    // Check if user can access a specific module
    canAccess: (mod: Module) => getPermission(mod).canView,
  };
}
