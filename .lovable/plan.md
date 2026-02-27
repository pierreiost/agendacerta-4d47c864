

# Centro de Comando Super Admin - Glassmorphism Premium

## Visao Geral

Transformar o modulo Super Admin em um Centro de Comando completo com 3 pilares:
1. Banco de dados (tabelas CRM + RPC de metricas globais)
2. Dashboard com metricas globais e graficos (Glassmorphism)
3. CRM Kanban com drag-and-drop

O Super Admin atual (pagina unica em `/superadmin`) sera reestruturado em sub-rotas com navegacao por tabs/abas internas.

---

## Fase 1: Banco de Dados

### Tabela `saas_crm_columns`
```sql
CREATE TABLE public.saas_crm_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saas_crm_columns ENABLE ROW LEVEL SECURITY;
-- Apenas superadmins
CREATE POLICY "Superadmins can manage crm columns" ON public.saas_crm_columns
  FOR ALL TO authenticated USING (public.is_superadmin(auth.uid()));
```

### Tabela `saas_crm_leads`
```sql
CREATE TABLE public.saas_crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  person_name text NOT NULL,
  company_name text NOT NULL,
  whatsapp text,
  plan text DEFAULT 'basic',
  segment text DEFAULT 'sports',
  status_id uuid NOT NULL REFERENCES public.saas_crm_columns(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saas_crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins can manage crm leads" ON public.saas_crm_leads
  FOR ALL TO authenticated USING (public.is_superadmin(auth.uid()));
```

### Seed das Colunas
Inserir 6 colunas: "Lead/Novo", "Contato Feito", "Em Negociacao", "Nao Respondeu (Vacuo)", "Fechado/Ativo", "Perdido/Churn" com cores distintas.

### RPC `get_saas_global_metrics`
Funcao `SECURITY DEFINER` que retorna:
- **Totais globais**: count de venues, bookings, customers, service_orders, products, services
- **Por venue**: lista com venue_id, name, segment, e contagens individuais de bookings, customers, service_orders, products, services
- **Crescimento mensal**: agendamentos criados nos ultimos 6 meses (para o AreaChart)

---

## Fase 2: Reestruturar Rotas

### Mudancas no `App.tsx`
- Manter `/superadmin` como rota base (SuperAdminRoute)
- Criar sub-rotas internas via Tabs no componente principal:
  - Tab "Dashboard" (metricas globais + graficos)
  - Tab "CRM" (kanban)
  - Tab "Clientes" (tabela atual, preservada)

### Mudancas na Sidebar
- Atualizar o menu do superadmin para ter sub-itens ou manter "Super Admin" como unico link (as tabs internas cuidam da navegacao)

---

## Fase 3: Dashboard Glassmorphism (`/superadmin` tab Dashboard)

### Novos Arquivos
- `src/components/superadmin/SuperAdminDashboard.tsx`
- `src/components/superadmin/GlassCard.tsx` (componente reutilizavel)
- `src/components/superadmin/GrowthChart.tsx` (AreaChart com gradiente)
- `src/components/superadmin/TopVenuesChart.tsx` (BarChart horizontal)
- `src/components/superadmin/EngagementTable.tsx` (tabela estilizada)
- `src/hooks/useSaasMetrics.ts` (hook para chamar a RPC)

### Design Glassmorphism
Todos os componentes seguirao o padrao visual:
- Container principal: `bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950` (dark) com pattern sutil
- Cards totalizadores: `backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-2xl`
- Hover nos cards: `hover:bg-white/10 hover:shadow-primary/20 transition-all`
- Header da pagina: efeito glass translucido com gradiente
- Tipografia: pesos variados, cores com opacidade (`text-white/90`, `text-white/60`)

### Cards Totalizadores (estilo cartao de credito fosco)
4 cards em grid responsivo:
1. Total de Venues (icone Building2)
2. Agendamentos na plataforma (icone Calendar)
3. Clientes criados (icone Users)
4. OS geradas (icone FileText)

Cada card tera: valor grande, label pequeno, icone decorativo, e um indicador visual (linha de cor ou gradiente lateral).

### Graficos (Recharts)
**AreaChart - Crescimento de Uso**:
- Ultimos 6 meses de agendamentos criados
- Area preenchida com gradiente (`linearGradient` do Recharts)
- Fundo do grafico translucido
- Grid sutil, tooltip estilizado

**BarChart - Top 5 Venues**:
- Barras horizontais com gradiente
- Labels das venues
- Tooltip glass

### Tabela de Engajamento
- Tabela com fundo glass, rows com hover translucido
- Colunas: Venue, Segmento, Agendamentos, Clientes, Servicos, Produtos, OS
- Badges de segmento com cores
- Ordenavel por clique no header

---

## Fase 4: CRM Kanban (`/superadmin` tab CRM)

### Dependencia
- Instalar `@hello-pangea/dnd` para drag-and-drop (leve, fork mantido do react-beautiful-dnd)

### Novos Arquivos
- `src/components/superadmin/CrmBoard.tsx` (board principal)
- `src/components/superadmin/CrmColumn.tsx` (coluna do kanban)
- `src/components/superadmin/CrmLeadCard.tsx` (card do lead)
- `src/components/superadmin/AddLeadDialog.tsx` (form para novo lead)
- `src/hooks/useCrmBoard.ts` (hook para CRUD de leads e colunas)

### Design do Board
- Fundo: gradiente escuro elegante
- Colunas: `backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl` com header colorido (cor da coluna)
- Scroll horizontal no board se muitas colunas
- Cada coluna com contador de leads

### Design dos Cards (Leads)
- `backdrop-blur-sm bg-white/8 border border-white/15 rounded-xl`
- Hover: `hover:bg-white/12 hover:border-white/25 hover:shadow-lg`
- Conteudo:
  - Nome da empresa (bold, destaque)
  - Nome do contato (texto secundario)
  - Botao WhatsApp (icone verde, clicavel -> `wa.me/numero`)
  - Badges: Plano (Basic/Max) e Segmento (Beauty/Health/Sports/Custom) com cores distintas
- Animacao sutil no drag

### Interacoes
- Drag & Drop: ao soltar o card em outra coluna, atualiza `status_id` no banco
- Botao "+" no header de cada coluna ou botao global para adicionar lead
- Dialog de adicao: campos para person_name, company_name, whatsapp, plan (select), segment (select), status_id (select)
- Possibilidade de vincular a um venue existente (select opcional)

---

## Fase 5: Refatorar `SuperAdmin.tsx`

O arquivo atual sera refatorado:
- Manter como orquestrador com 3 tabs internas
- Tab "Dashboard" -> renderiza `SuperAdminDashboard`
- Tab "CRM" -> renderiza `CrmBoard`
- Tab "Clientes" -> preserva a VenueTable + modais existentes (extraidos para componentes)
- As tabs terao estilo glass tambem

### Componentes Extraidos do Atual
- `src/components/superadmin/VenueClientsTab.tsx` (tabela de venues atual)
- `src/components/superadmin/EditExpirationModal.tsx`
- `src/components/superadmin/InvoiceModal.tsx`

---

## Estrutura Final de Arquivos

```text
src/
  components/
    superadmin/
      SuperAdminDashboard.tsx    -- Dashboard com metricas
      GlassCard.tsx              -- Card glass reutilizavel
      GrowthChart.tsx            -- AreaChart crescimento
      TopVenuesChart.tsx         -- BarChart top venues
      EngagementTable.tsx        -- Tabela de engajamento
      CrmBoard.tsx               -- Board Kanban
      CrmColumn.tsx              -- Coluna do kanban
      CrmLeadCard.tsx            -- Card do lead
      AddLeadDialog.tsx          -- Dialog novo lead
      VenueClientsTab.tsx        -- Tab clientes (codigo atual)
      EditExpirationModal.tsx    -- Modal edicao datas
      InvoiceModal.tsx           -- Modal fatura
  hooks/
    useSaasMetrics.ts            -- Hook metricas globais
    useCrmBoard.ts               -- Hook CRUD CRM
  pages/
    SuperAdmin.tsx               -- Orquestrador com tabs
```

---

## Resumo Tecnico

| Item | Detalhe |
|---|---|
| Tabelas novas | `saas_crm_columns`, `saas_crm_leads` |
| RPC nova | `get_saas_global_metrics` (SECURITY DEFINER) |
| Dependencia nova | `@hello-pangea/dnd` |
| Arquivos novos | ~14 arquivos |
| Arquivos modificados | `SuperAdmin.tsx`, `App.tsx` (rotas) |
| RLS | Ambas tabelas protegidas por `is_superadmin()` |
| Graficos | Recharts (ja instalado) - AreaChart + BarChart |

