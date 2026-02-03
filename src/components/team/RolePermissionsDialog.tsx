import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield } from "lucide-react";
import { PermissionsGrid } from "./PermissionsGrid";
import { RoleTemplateSelector } from "./RoleTemplateSelector";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { ALL_MODULES, PERMISSION_TEMPLATES, type TemplateKey } from "@/lib/permission-templates";
import type { AppRole, Module, Permission } from "@/hooks/usePermissions";
import type { TeamMember } from "@/hooks/useTeamMembers";
import { useVenue } from "@/contexts/VenueContext";

interface RolePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
}

const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: "Super Admin",
  admin: "Administrador",
  manager: "Gerente",
  staff: "Funcionário",
};

// Create empty permissions for "Personalizado" template
const emptyPermissions: Record<Module, Permission> = {} as Record<Module, Permission>;
for (const mod of ALL_MODULES) {
  emptyPermissions[mod.key] = {
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
  };
}

export function RolePermissionsDialog({ open, onOpenChange, member }: RolePermissionsDialogProps) {
  const { currentVenue } = useVenue();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | null>("gerente");
  const [localPermissions, setLocalPermissions] = useState<Record<Module, Permission>>(
    { ...PERMISSION_TEMPLATES.gerente.permissions }
  );
  
  const { 
    permissionMap, 
    isLoading, 
    savePermissions, 
    isSaving,
    applyTemplate,
    isApplyingTemplate,
  } = useRolePermissions(member?.role);

  // Storage key for persistence
  const getStorageKey = useCallback(() => {
    if (!currentVenue?.id || !member?.id) return null;
    return `permissions_draft_${currentVenue.id}_${member.id}`;
  }, [currentVenue?.id, member?.id]);

  // Initialize local permissions when dialog opens or permissions load
  useEffect(() => {
    if (open && member) {
      const storageKey = getStorageKey();
      
      // Try to restore from localStorage first
      if (storageKey) {
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.permissions && parsed.template !== undefined) {
              setLocalPermissions(parsed.permissions);
              setSelectedTemplate(parsed.template);
              return;
            }
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
      
      // Check if there are existing permissions in the database
      const hasExistingPermissions = Object.keys(permissionMap).length > 0;
      
      if (hasExistingPermissions) {
        // Use existing permissions from database
        const existingPerms: Record<Module, Permission> = {} as Record<Module, Permission>;
        for (const mod of ALL_MODULES) {
          existingPerms[mod.key] = permissionMap[mod.key] || {
            canView: false,
            canCreate: false,
            canEdit: false,
            canDelete: false,
          };
        }
        setLocalPermissions(existingPerms);
        setSelectedTemplate(null); // Mark as custom since it's from DB
      } else {
        // No permissions yet - start with "Gerente" template pre-filled
        setLocalPermissions({ ...PERMISSION_TEMPLATES.gerente.permissions });
        setSelectedTemplate("gerente");
      }
    }
  }, [open, member, permissionMap, getStorageKey]);

  // Save to localStorage when permissions change
  useEffect(() => {
    const storageKey = getStorageKey();
    if (storageKey && open) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          permissions: localPermissions,
          template: selectedTemplate,
          timestamp: Date.now(),
        }));
      } catch (error) {
        // Ignore storage errors
      }
    }
  }, [localPermissions, selectedTemplate, getStorageKey, open]);

  const handleTemplateSelect = (templateKey: TemplateKey | null) => {
    setSelectedTemplate(templateKey);
    
    if (templateKey && PERMISSION_TEMPLATES[templateKey]) {
      setLocalPermissions({ ...PERMISSION_TEMPLATES[templateKey].permissions });
    } else {
      // "Personalizado" - start with empty permissions
      setLocalPermissions({ ...emptyPermissions });
    }
  };

  const handlePermissionChange = (module: Module, action: keyof Permission, value: boolean) => {
    setSelectedTemplate(null); // Mark as customized
    
    setLocalPermissions((prev) => {
      const updated = { ...prev };
      updated[module] = { ...updated[module], [action]: value };
      
      // If view is disabled, disable all other actions
      if (action === "canView" && !value) {
        updated[module] = {
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        };
      }
      
      return updated;
    });
  };

  const clearDraft = useCallback(() => {
    const storageKey = getStorageKey();
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [getStorageKey]);

  const handleSave = () => {
    if (!member) return;

    const permissionsToSave = Object.entries(localPermissions).map(([module, perm]) => ({
      module: module as Module,
      can_view: perm.canView,
      can_create: perm.canCreate,
      can_edit: perm.canEdit,
      can_delete: perm.canDelete,
    }));

    savePermissions(
      { targetRole: member.role, permissionsToSave },
      { 
        onSuccess: () => {
          clearDraft();
          onOpenChange(false);
        } 
      }
    );
  };

  const isAdmin = member?.role === "admin" || member?.role === "superadmin";
  const memberName = member?.display_name || member?.profile?.full_name || "Membro";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configurar Permissões
          </DialogTitle>
          <DialogDescription>
            Configure as permissões de acesso para {memberName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Member Info */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">{memberName}</p>
              <p className="text-sm text-muted-foreground">
                Função: <Badge variant="secondary">{member ? ROLE_LABELS[member.role] : ""}</Badge>
              </p>
            </div>
          </div>

          {isAdmin ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-amber-800 dark:text-amber-200 font-medium">
                ⚠️ Administradores têm acesso completo
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                Não é possível personalizar permissões para administradores. Eles sempre têm acesso total ao sistema.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* Template Selector */}
              <RoleTemplateSelector
                selectedTemplate={selectedTemplate}
                onSelect={handleTemplateSelect}
                disabled={isSaving}
              />

              {/* Permissions Grid */}
              <PermissionsGrid
                permissions={localPermissions}
                onChange={handlePermissionChange}
                disabled={isSaving}
              />
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isAdmin}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Permissões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
