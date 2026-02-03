import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ALL_MODULES } from "@/lib/permission-templates";
import type { Module, Permission } from "@/hooks/usePermissions";

interface PermissionsGridProps {
  permissions: Record<Module, Permission>;
  onChange: (module: Module, action: keyof Permission, value: boolean) => void;
  disabled?: boolean;
}

const ACTION_LABELS: Record<keyof Permission, string> = {
  canView: "Ver",
  canCreate: "Criar",
  canEdit: "Editar",
  canDelete: "Excluir",
};

export function PermissionsGrid({ permissions, onChange, disabled }: PermissionsGridProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-5 bg-muted/50 border-b">
        <div className="p-3 font-medium text-sm">Módulo</div>
        <div className="p-3 font-medium text-sm text-center">Ver</div>
        <div className="p-3 font-medium text-sm text-center">Criar</div>
        <div className="p-3 font-medium text-sm text-center">Editar</div>
        <div className="p-3 font-medium text-sm text-center">Excluir</div>
      </div>

      {/* Rows */}
      {ALL_MODULES.map((mod, idx) => {
        const perm = permissions[mod.key] || { canView: false, canCreate: false, canEdit: false, canDelete: false };
        const hasCreate = mod.actions.includes("create");
        const hasEdit = mod.actions.includes("edit");
        const hasDelete = mod.actions.includes("delete");

        return (
          <div
            key={mod.key}
            className={`grid grid-cols-5 items-center ${idx !== ALL_MODULES.length - 1 ? "border-b" : ""} ${
              idx % 2 === 0 ? "bg-background" : "bg-muted/20"
            }`}
          >
            <div className="p-3">
              <Label className="text-sm font-normal">{mod.label}</Label>
            </div>
            
            {/* Ver */}
            <div className="p-3 flex justify-center">
              <Checkbox
                checked={perm.canView}
                onCheckedChange={(checked) => onChange(mod.key, "canView", !!checked)}
                disabled={disabled}
              />
            </div>
            
            {/* Criar */}
            <div className="p-3 flex justify-center">
              {hasCreate ? (
                <Checkbox
                  checked={perm.canCreate}
                  onCheckedChange={(checked) => onChange(mod.key, "canCreate", !!checked)}
                  disabled={disabled || !perm.canView}
                />
              ) : (
                <span className="text-muted-foreground text-xs">-</span>
              )}
            </div>
            
            {/* Editar */}
            <div className="p-3 flex justify-center">
              {hasEdit ? (
                <Checkbox
                  checked={perm.canEdit}
                  onCheckedChange={(checked) => onChange(mod.key, "canEdit", !!checked)}
                  disabled={disabled || !perm.canView}
                />
              ) : (
                <span className="text-muted-foreground text-xs">-</span>
              )}
            </div>
            
            {/* Excluir */}
            <div className="p-3 flex justify-center">
              {hasDelete ? (
                <Checkbox
                  checked={perm.canDelete}
                  onCheckedChange={(checked) => onChange(mod.key, "canDelete", !!checked)}
                  disabled={disabled || !perm.canView}
                />
              ) : (
                <span className="text-muted-foreground text-xs">-</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
