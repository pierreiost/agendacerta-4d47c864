
# Plano: UI de Permissões Completa com Grupos Pré-definidos

## Objetivo

Implementar a interface de gerenciamento de permissões na aba Equipe das Configurações, com:

1. **Grupos pré-definidos** (templates) que o cliente pode usar para ter menos trabalho
2. **Permissões totalmente customizáveis** por módulo e ação
3. **Gestão visual** intuitiva para alterar role de membros

---

## 1. Grupos Pré-definidos (Templates)

Criar templates de permissões prontas para uso:

```text
GERENTE
- Dashboard: Ver
- Agenda: Completo
- Clientes: Completo
- Produtos: Ver, Criar, Editar
- Financeiro: Ver
- Ordens de Serviço: Completo
- Relatórios: Ver

CAIXA
- Dashboard: Ver
- Agenda: Ver
- Clientes: Ver, Criar
- Produtos: Ver
- Financeiro: Ver, Criar (despesas)
- Ordens de Serviço: Ver, Criar

OPERADOR
- Dashboard: Ver
- Agenda: Ver, Criar, Editar
- Clientes: Ver, Criar
- Produtos: Ver
- Ordens de Serviço: Ver, Criar, Editar

RECEPÇÃO
- Dashboard: Ver
- Agenda: Completo
- Clientes: Ver, Criar, Editar
- Produtos: Ver
- Ordens de Serviço: Ver
```

---

## 2. Estrutura de Componentes

### 2.1 Novos Arquivos

```text
src/components/team/
├── TeamMembersList.tsx        # Lista de membros com ações
├── RolePermissionsDialog.tsx  # Dialog de edição de permissões
├── RoleTemplateSelector.tsx   # Seletor de template pré-definido
├── PermissionsGrid.tsx        # Grid de checkboxes por módulo
├── InviteMemberDialog.tsx     # Dialog para convidar novo membro
└── index.ts                   # Barrel export

src/hooks/
├── useTeamMembers.ts          # Hook para CRUD de membros e roles
└── useRolePermissions.ts      # Hook para CRUD de permissões
```

### 2.2 Fluxo de UI

```text
┌─────────────────────────────────────────────────────────────────┐
│ EQUIPE                                        [+ Convidar]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 👤 João Silva          │ Administrador │         -        │   │
│ ├───────────────────────────────────────────────────────────┤   │
│ │ 👤 Maria Santos        │ Gerente ▼     │ [⚙ Permissões]  │   │
│ ├───────────────────────────────────────────────────────────┤   │
│ │ 👤 Pedro Alves         │ Operador ▼    │ [⚙ Permissões]  │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ PERMISSÕES POR FUNÇÃO                    [Configurar]     │   │
│ │                                                           │   │
│ │ Configure as permissões padrão para cada função.         │   │
│ │ Você também pode personalizar permissões individuais.    │   │
│ └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Dialog de Permissões

```text
┌─────────────────────────────────────────────────────────────────┐
│ Configurar Permissões                                     [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Membro: Maria Santos                                           │
│ Função atual: Gerente                                          │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 🎯 USAR TEMPLATE                                          │   │
│ │                                                           │   │
│ │ [Gerente] [Caixa] [Operador] [Recepção] [Personalizado]  │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌──────────────┬───────┬────────┬─────────┬──────────┐         │
│ │ Módulo       │  Ver  │ Criar  │ Editar  │ Excluir  │         │
│ ├──────────────┼───────┼────────┼─────────┼──────────┤         │
│ │ Dashboard    │  [✓]  │   -    │    -    │    -     │         │
│ │ Agenda       │  [✓]  │  [✓]   │   [✓]   │   [✓]    │         │
│ │ Clientes     │  [✓]  │  [✓]   │   [✓]   │   [✓]    │         │
│ │ Espaços      │  [✓]  │  [✓]   │   [✓]   │   [ ]    │         │
│ │ Serviços     │  [✓]  │  [✓]   │   [✓]   │   [ ]    │         │
│ │ Produtos     │  [✓]  │  [✓]   │   [✓]   │   [ ]    │         │
│ │ OS           │  [✓]  │  [✓]   │   [✓]   │   [✓]    │         │
│ │ Financeiro   │  [✓]  │  [ ]   │   [ ]   │   [ ]    │         │
│ │ Relatórios   │  [✓]  │   -    │    -    │    -     │         │
│ │ Equipe       │  [✓]  │  [ ]   │   [ ]   │   [ ]    │         │
│ │ Configurações│  [✓]  │  [ ]   │   [ ]   │   [ ]    │         │
│ │ Pág. Pública │  [✓]  │  [ ]   │   [ ]   │   [ ]    │         │
│ └──────────────┴───────┴────────┴─────────┴──────────┘         │
│                                                                 │
│                               [Cancelar]  [Salvar Permissões]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Detalhes Técnicos

### 4.1 Hook useRolePermissions

```typescript
// Funções:
// - fetchPermissions(venueId, role) - Buscar permissões atuais
// - savePermissions(venueId, role, permissions[]) - Salvar em lote
// - applyTemplate(venueId, role, templateName) - Aplicar template
```

### 4.2 Hook useTeamMembers

```typescript
// Funções:
// - listMembers(venueId) - Listar membros com profile
// - updateMemberRole(memberId, newRole) - Alterar função
// - inviteMember(email, role) - Convidar novo membro (futuro)
// - removeMember(memberId) - Remover membro
```

### 4.3 Templates de Permissão

```typescript
export const PERMISSION_TEMPLATES = {
  gerente: {
    label: "Gerente",
    description: "Acesso operacional completo, financeiro apenas visualização",
    permissions: {
      dashboard: { view: true },
      agenda: { view: true, create: true, edit: true, delete: true },
      clientes: { view: true, create: true, edit: true, delete: true },
      // ... etc
    }
  },
  caixa: { ... },
  operador: { ... },
  recepcao: { ... },
}
```

---

## 5. Módulos Disponíveis

Lista de módulos para controle de permissão:

| Módulo | Descrição | Ações |
|--------|-----------|-------|
| dashboard | Visão geral | Ver |
| agenda | Reservas e agendamentos | Ver, Criar, Editar, Excluir |
| clientes | Base de clientes | Ver, Criar, Editar, Excluir |
| espacos | Espaços/salas | Ver, Criar, Editar, Excluir |
| servicos | Catálogo de serviços | Ver, Criar, Editar, Excluir |
| produtos | Catálogo de produtos | Ver, Criar, Editar, Excluir |
| ordens_servico | Ordens de serviço | Ver, Criar, Editar, Excluir |
| financeiro | Receitas e despesas | Ver, Criar, Editar, Excluir |
| relatorios | Relatórios | Ver |
| equipe | Gestão de membros | Ver, Criar, Editar, Excluir |
| configuracoes | Config da unidade | Ver, Editar |
| pagina_publica | Página pública | Ver, Editar |

---

## 6. Arquivos a Criar/Modificar

### Novos Arquivos:
1. `src/hooks/useTeamMembers.ts` - Hook para gestão de membros
2. `src/hooks/useRolePermissions.ts` - Hook para gestão de permissões
3. `src/components/team/TeamMembersList.tsx` - Lista de membros
4. `src/components/team/RolePermissionsDialog.tsx` - Dialog de permissões
5. `src/components/team/PermissionsGrid.tsx` - Grid de checkboxes
6. `src/components/team/RoleTemplateSelector.tsx` - Seletor de templates
7. `src/components/team/InviteMemberDialog.tsx` - Convite de membros
8. `src/components/team/index.ts` - Barrel export
9. `src/lib/permission-templates.ts` - Templates pré-definidos

### Modificar:
1. `src/pages/Configuracoes.tsx` - Integrar nova aba Equipe expandida
2. `src/components/layout/AppSidebar.tsx` - Filtrar menu por permissões (usar usePermissions)

---

## 7. Ordem de Implementação

1. **Criar templates de permissão** (`permission-templates.ts`)
2. **Criar hooks** (`useTeamMembers`, `useRolePermissions`)
3. **Criar componentes de UI** (Grid, Dialog, Seletor)
4. **Integrar na página Configurações** (aba Equipe)
5. **Aplicar filtro de sidebar** (ocultar menus sem permissão)

---

## 8. Considerações de Segurança

- Apenas **admin** pode alterar permissões de outros membros
- Admin não pode rebaixar a si mesmo (evitar lock-out)
- Admin não pode ser retirado NENHUMA permissão, o admin é imutavel
- Permissões são validadas no backend via RLS + função `check_permission`
- Não pode dar erro generico nas telas, precisa ser avisado que não possui permissão, ou nem aparecer
- Templates são aplicados client-side mas salvos individualmente no banco
