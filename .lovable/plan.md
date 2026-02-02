
# Plano: Módulo Financeiro + Sistema de Permissões por Operador

## Progresso

### ✅ Fase 1 - Database (CONCLUÍDO)
- [x] Criado enum `expense_category`
- [x] Criado tabela `expenses` com RLS
- [x] Criado tabela `role_permissions` com RLS
- [x] Criado função `check_permission`
- [x] Criado função `get_user_venue_role`

### ✅ Fase 2 - Módulo Financeiro (CONCLUÍDO)
- [x] Hook `useExpenses` (CRUD completo)
- [x] Hook `useFinancialMetrics` (métricas agregadas)
- [x] Hook `usePermissions` (controle de acesso)
- [x] Página `/financeiro` com abas
- [x] Componentes: FinancialSummary, CashFlowChart, ExpenseList, RevenueList, ExpenseFormDialog
- [x] Rota adicionada no App.tsx
- [x] Link no sidebar

### 🔄 Fase 3 - Permissões UI (PENDENTE)
- [ ] PermissionsDialog para configurar permissões individuais
- [ ] Expandir aba Equipe em Configurações
- [ ] InviteMemberDialog para convidar membros
- [ ] Filtrar menu da sidebar por permissões

---

## Visão Geral

Este plano aborda duas funcionalidades críticas para a operação comercial do sistema:

1. **Módulo Financeiro**: Controle completo de fluxo de caixa com receitas (faturamento) e despesas (compras, pagamentos, etc.)
2. **Sistema de Permissões**: Controle granular de acesso por função (Admin, Gerente, Funcionário)

---

Lembre-se que o sistema é multisegmento, tente não especificar muito

## Parte 1: Módulo de Controle Financeiro

### 1.1 Nova Estrutura de Dados

Criar tabela `expenses` para registrar despesas:

```text
┌─────────────────────────────────────────────────────────────────┐
│ expenses                                                         │
├─────────────────────────────────────────────────────────────────┤
│ id              │ uuid (PK)                                     │
│ venue_id        │ uuid (FK venues)                              │
│ category        │ enum (material, salary, rent, utilities,      │
│                 │       maintenance, marketing, other)          │
│ description     │ text                                          │
│ amount          │ numeric                                       │
│ payment_method  │ enum (CASH, CREDIT, DEBIT, PIX, TRANSFER)    │
│ expense_date    │ date                                          │
│ due_date        │ date (nullable - para contas a pagar)        │
│ paid_at         │ timestamp (nullable)                          │
│ is_paid         │ boolean (default true)                        │
│ supplier        │ text (nullable)                               │
│ notes           │ text (nullable)                               │
│ receipt_url     │ text (nullable - comprovante)                 │
│ created_by      │ uuid (FK auth.users)                          │
│ created_at      │ timestamp                                     │
│ updated_at      │ timestamp                                     │
└─────────────────────────────────────────────────────────────────┘
```

Criar enum para categorias de despesa:

```text
expense_category: 
  - material (Compra de material/produtos)
  - salary (Pagamento funcionários)  
  - rent (Aluguel)
  - utilities (Água, luz, internet)
  - maintenance (Manutenção/reparos)
  - marketing (Marketing/publicidade)
  - other (Outros)
```

### 1.2 Nova Página: Financeiro (/financeiro)

Layout com abas:

```text
┌─────────────────────────────────────────────────────────────────┐
│ FINANCEIRO                                         [+ Despesa]  │
├─────────────────────────────────────────────────────────────────┤
│ [Resumo] [Receitas] [Despesas] [Fluxo de Caixa]                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ RECEITAS     │ │ DESPESAS     │ │ SALDO        │            │
│  │ R$ 15.420    │ │ R$ 8.350     │ │ R$ 7.070     │            │
│  │ ↑ 12%        │ │ ↓ 5%         │ │ ↑ 25%        │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ GRÁFICO: Receitas vs Despesas (últimos 6 meses)             │
│  │ [Barras empilhadas ou linha]                                │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Tab: Receitas (somente leitura)

Agregação automática de:
- Reservas finalizadas (tabela `bookings` onde status = 'FINALIZED')
- Ordens de serviço finalizadas (tabela `service_orders` onde status = 'finished' ou 'invoiced')

Filtros: período, espaço/serviço, cliente

### 1.4 Tab: Despesas (CRUD completo)

Lista de despesas com:
- Filtros: categoria, período, status (pago/pendente)
- Ações: criar, editar, excluir, marcar como pago
- Dialog de formulário para nova despesa

### 1.5 Tab: Fluxo de Caixa

Visualização combinada:
- Gráfico de linha/barra mostrando entradas vs saídas
- Saldo acumulado por período
- Projeção de contas a pagar

### 1.6 Arquivos a Criar/Modificar

**Novos arquivos:**
- `src/pages/Financeiro.tsx` - Página principal
- `src/hooks/useExpenses.ts` - Hook de despesas (CRUD)
- `src/hooks/useFinancialMetrics.ts` - Métricas agregadas
- `src/components/financeiro/ExpenseFormDialog.tsx` - Formulário
- `src/components/financeiro/RevenueList.tsx` - Lista de receitas
- `src/components/financeiro/ExpenseList.tsx` - Lista de despesas
- `src/components/financeiro/CashFlowChart.tsx` - Gráfico de fluxo
- `src/components/financeiro/FinancialSummary.tsx` - Cards resumo

**Modificar:**
- `src/App.tsx` - Adicionar rota /financeiro
- `src/components/layout/AppSidebar.tsx` - Adicionar link Financeiro

---

## Parte 2: Sistema de Permissões por Operador

### 2.1 Estrutura de Permissões

Criar tabela `role_permissions` para configuração granular:

```text
┌─────────────────────────────────────────────────────────────────┐
│ role_permissions                                                 │
├─────────────────────────────────────────────────────────────────┤
│ id              │ uuid (PK)                                     │
│ venue_id        │ uuid (FK venues)                              │
│ role            │ app_role (admin, manager, staff)              │
│ module          │ text (agenda, clientes, financeiro, etc.)     │
│ can_view        │ boolean                                       │
│ can_create      │ boolean                                       │
│ can_edit        │ boolean                                       │
│ can_delete      │ boolean                                       │
│ created_at      │ timestamp                                     │
│ updated_at      │ timestamp                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Permissões Padrão por Função

```text
┌────────────────┬──────────────────────────────────────────────────┐
│ MÓDULO         │ ADMIN      │ GERENTE     │ FUNCIONÁRIO          │
├────────────────┼────────────┼─────────────┼──────────────────────┤
│ Dashboard      │ Completo   │ Completo    │ Visualizar           │
│ Agenda         │ Completo   │ Completo    │ Criar/Editar próprias│
│ Clientes       │ Completo   │ Completo    │ Visualizar/Criar     │
│ Espaços        │ Completo   │ Completo    │ Visualizar           │
│ Serviços       │ Completo   │ Completo    │ Visualizar           │
│ Produtos       │ Completo   │ Completo    │ Visualizar           │
│ Ordens Serviço │ Completo   │ Completo    │ Criar/Editar próprias│
│ Financeiro     │ Completo   │ Visualizar  │ Sem acesso           │
│ Relatórios     │ Completo   │ Visualizar  │ Sem acesso           │
│ Equipe         │ Completo   │ Visualizar  │ Sem acesso           │
│ Configurações  │ Completo   │ Parcial     │ Sem acesso           │
└────────────────┴────────────┴─────────────┴──────────────────────┘
```

### 2.3 Hook de Permissões

Criar `usePermissions` para verificação em tempo real:

```typescript
// Uso no componente:
const { canView, canCreate, canEdit, canDelete } = usePermissions('financeiro');

if (!canView) return <AccessDenied />;
```

### 2.4 Interface de Configuração (Aba Equipe)

Melhorar a aba Equipe em Configurações:

```text
┌─────────────────────────────────────────────────────────────────┐
│ GERENCIAR EQUIPE                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [+ Convidar Membro]                                            │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐
│ │ João Silva           │ Administrador │ [Configurar]         │
│ │ joao@email.com       │ Acesso total  │                      │
│ ├─────────────────────────────────────────────────────────────┤
│ │ Maria Santos         │ Gerente       │ [Configurar]         │
│ │ maria@email.com      │ 8 módulos     │                      │
│ ├─────────────────────────────────────────────────────────────┤
│ │ Pedro Alves          │ Funcionário   │ [Configurar]         │
│ │ pedro@email.com      │ 4 módulos     │                      │
│ └─────────────────────────────────────────────────────────────┘
│                                                                 │
│ [Configurar Permissões Padrão por Função]                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 Dialog de Permissões Individuais

```text
┌─────────────────────────────────────────────────────────────────┐
│ Permissões: Maria Santos (Gerente)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ☑ Usar padrão da função "Gerente"                              │
│   ou                                                            │
│ ☐ Personalizar permissões                                      │
│                                                                 │
│ ┌──────────────┬──────┬───────┬────────┬─────────┐             │
│ │ Módulo       │ Ver  │ Criar │ Editar │ Excluir │             │
│ ├──────────────┼──────┼───────┼────────┼─────────┤             │
│ │ Dashboard    │  ✓   │   -   │   -    │    -    │             │
│ │ Agenda       │  ✓   │   ✓   │   ✓    │    ✓    │             │
│ │ Clientes     │  ✓   │   ✓   │   ✓    │    ✓    │             │
│ │ Financeiro   │  ✓   │   ✗   │   ✗    │    ✗    │             │
│ │ Relatórios   │  ✓   │   -   │   -    │    -    │             │
│ │ Equipe       │  ✓   │   ✗   │   ✗    │    ✗    │             │
│ │ Configurações│  ✓   │   ✗   │   ✗    │    ✗    │             │
│ └──────────────┴──────┴───────┴────────┴─────────┘             │
│                                                                 │
│                            [Cancelar]  [Salvar]                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.6 Fluxo de Convite de Novo Membro

1. Admin clica em "Convidar Membro"
2. Preenche: Email + Função inicial
3. Sistema cria entrada em `venue_members` com o user_id quando o convidado aceitar
4. Convidado recebe email com link de convite
5. Ao criar conta ou fazer login, é vinculado automaticamente à venue

### 2.7 Arquivos a Criar/Modificar

**Novos arquivos:**
- `src/hooks/usePermissions.ts` - Hook central de permissões
- `src/hooks/useTeamMembers.ts` - Hook para gestão de equipe (CRUD)
- `src/components/team/PermissionsDialog.tsx` - Dialog de permissões
- `src/components/team/InviteMemberDialog.tsx` - Convite de membros
- `src/components/team/RolePermissionsConfig.tsx` - Config padrão por função
- `src/components/shared/AccessDenied.tsx` - Componente de acesso negado

**Modificar:**
- `src/pages/Configuracoes.tsx` - Expandir aba Equipe
- `src/components/layout/AppSidebar.tsx` - Filtrar menu por permissões
- Todas as páginas: Adicionar verificação de permissões

---

## Parte 3: Migração de Banco de Dados

### 3.1 SQL Necessário

```sql
-- 1. Criar enum de categoria de despesa
CREATE TYPE expense_category AS ENUM (
  'material', 'salary', 'rent', 'utilities', 
  'maintenance', 'marketing', 'other'
);

-- 2. Criar tabela expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  category expense_category NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method payment_method,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  is_paid BOOLEAN NOT NULL DEFAULT true,
  supplier TEXT,
  notes TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Criar tabela role_permissions  
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(venue_id, role, module)
);

-- 4. RLS Policies para expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expenses"
ON expenses FOR SELECT
USING (is_venue_member(auth.uid(), venue_id));

CREATE POLICY "Admins/Managers can manage expenses"
ON expenses FOR ALL
USING (is_venue_admin(auth.uid(), venue_id) OR 
       EXISTS (
         SELECT 1 FROM venue_members 
         WHERE venue_id = expenses.venue_id 
         AND user_id = auth.uid() 
         AND role IN ('admin', 'manager')
       ));

-- 5. RLS Policies para role_permissions
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage permissions"
ON role_permissions FOR ALL
USING (is_venue_admin(auth.uid(), venue_id));

CREATE POLICY "Members can view permissions"
ON role_permissions FOR SELECT
USING (is_venue_member(auth.uid(), venue_id));

-- 6. Função para verificar permissão específica
CREATE OR REPLACE FUNCTION check_permission(
  _user_id UUID,
  _venue_id UUID,
  _module TEXT,
  _action TEXT -- 'view', 'create', 'edit', 'delete'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
  _has_permission BOOLEAN;
BEGIN
  -- Obter role do usuário na venue
  SELECT role INTO _role
  FROM venue_members
  WHERE user_id = _user_id AND venue_id = _venue_id;
  
  IF _role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Admin sempre tem acesso total
  IF _role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Verificar permissão específica
  EXECUTE format(
    'SELECT can_%s FROM role_permissions WHERE venue_id = $1 AND role = $2 AND module = $3',
    _action
  ) INTO _has_permission
  USING _venue_id, _role, _module;
  
  RETURN COALESCE(_has_permission, false);
END;
$$;
```

---

## Resumo de Entregáveis

| Item | Arquivos | Prioridade |
|------|----------|------------|
| Tabela expenses + RLS | Migration SQL | Alta |
| Tabela role_permissions + RLS | Migration SQL | Alta |
| Página Financeiro | 8 arquivos novos | Alta |
| Hook useExpenses | 1 arquivo | Alta |
| Hook usePermissions | 1 arquivo | Alta |
| Expansão aba Equipe | 4 arquivos novos + edições | Média |
| Filtro menu por permissões | 1 edição | Média |
| Verificação em todas as páginas | Múltiplas edições | Baixa |

---

## Ordem de Implementação Sugerida

1. **Fase 1 - Database**: Criar tabelas e policies
2. **Fase 2 - Financeiro**: Página + hooks + componentes
3. **Fase 3 - Permissões Backend**: Hook usePermissions + função SQL
4. **Fase 4 - Permissões UI**: Dialogs + configuração na aba Equipe
5. **Fase 5 - Integração**: Filtrar menu + verificações nas páginas
