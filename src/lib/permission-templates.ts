import type { Module, Permission } from "@/hooks/usePermissions";

export type TemplateKey = "gerente" | "caixa" | "operador" | "recepcao";

export interface PermissionTemplate {
  label: string;
  description: string;
  permissions: Record<Module, Permission>;
}

// All modules available in the system
export const ALL_MODULES: { key: Module; label: string; actions: ("view" | "create" | "edit" | "delete")[] }[] = [
  { key: "dashboard", label: "Dashboard", actions: ["view"] },
  { key: "agenda", label: "Agenda", actions: ["view", "create", "edit", "delete"] },
  { key: "clientes", label: "Clientes", actions: ["view", "create", "edit", "delete"] },
  { key: "espacos", label: "Espaços", actions: ["view", "create", "edit", "delete"] },
  { key: "servicos", label: "Serviços", actions: ["view", "create", "edit", "delete"] },
  { key: "produtos", label: "Produtos", actions: ["view", "create", "edit", "delete"] },
  { key: "ordens_servico", label: "Ordens de Serviço", actions: ["view", "create", "edit", "delete"] },
  { key: "financeiro", label: "Financeiro", actions: ["view", "create", "edit", "delete"] },
  { key: "relatorios", label: "Relatórios", actions: ["view"] },
  { key: "equipe", label: "Equipe", actions: ["view", "create", "edit", "delete"] },
  { key: "configuracoes", label: "Configurações", actions: ["view", "edit"] },
  { key: "pagina_publica", label: "Página Pública", actions: ["view", "edit"] },
];

// Helper to create a full permission object
const fullAccess: Permission = { canView: true, canCreate: true, canEdit: true, canDelete: true };
const viewOnly: Permission = { canView: true, canCreate: false, canEdit: false, canDelete: false };
const noAccess: Permission = { canView: false, canCreate: false, canEdit: false, canDelete: false };

export const PERMISSION_TEMPLATES: Record<TemplateKey, PermissionTemplate> = {
  gerente: {
    label: "Gerente",
    description: "Acesso operacional completo, financeiro apenas visualização",
    permissions: {
      dashboard: viewOnly,
      agenda: fullAccess,
      clientes: fullAccess,
      espacos: { canView: true, canCreate: true, canEdit: true, canDelete: false },
      servicos: { canView: true, canCreate: true, canEdit: true, canDelete: false },
      produtos: { canView: true, canCreate: true, canEdit: true, canDelete: false },
      ordens_servico: fullAccess,
      financeiro: viewOnly,
      relatorios: viewOnly,
      equipe: viewOnly,
      configuracoes: viewOnly,
      pagina_publica: viewOnly,
    },
  },
  caixa: {
    label: "Caixa",
    description: "Foco em vendas e recebimentos",
    permissions: {
      dashboard: viewOnly,
      agenda: viewOnly,
      clientes: { canView: true, canCreate: true, canEdit: false, canDelete: false },
      espacos: viewOnly,
      servicos: viewOnly,
      produtos: viewOnly,
      ordens_servico: { canView: true, canCreate: true, canEdit: false, canDelete: false },
      financeiro: { canView: true, canCreate: true, canEdit: false, canDelete: false },
      relatorios: noAccess,
      equipe: noAccess,
      configuracoes: noAccess,
      pagina_publica: noAccess,
    },
  },
  operador: {
    label: "Operador",
    description: "Executa serviços e atualiza ordens",
    permissions: {
      dashboard: viewOnly,
      agenda: { canView: true, canCreate: true, canEdit: true, canDelete: false },
      clientes: { canView: true, canCreate: true, canEdit: false, canDelete: false },
      espacos: viewOnly,
      servicos: viewOnly,
      produtos: viewOnly,
      ordens_servico: { canView: true, canCreate: true, canEdit: true, canDelete: false },
      financeiro: noAccess,
      relatorios: noAccess,
      equipe: noAccess,
      configuracoes: noAccess,
      pagina_publica: noAccess,
    },
  },
  recepcao: {
    label: "Recepção",
    description: "Foco em agendamentos e atendimento ao cliente",
    permissions: {
      dashboard: viewOnly,
      agenda: fullAccess,
      clientes: { canView: true, canCreate: true, canEdit: true, canDelete: false },
      espacos: viewOnly,
      servicos: viewOnly,
      produtos: viewOnly,
      ordens_servico: viewOnly,
      financeiro: noAccess,
      relatorios: noAccess,
      equipe: noAccess,
      configuracoes: noAccess,
      pagina_publica: noAccess,
    },
  },
};

// Convert template permissions to array for database storage
export function templateToPermissionArray(
  templateKey: TemplateKey
): { module: Module; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[] {
  const template = PERMISSION_TEMPLATES[templateKey];
  return Object.entries(template.permissions).map(([module, perm]) => ({
    module: module as Module,
    can_view: perm.canView,
    can_create: perm.canCreate,
    can_edit: perm.canEdit,
    can_delete: perm.canDelete,
  }));
}
